import os
import math
import re
from hashlib import blake2b
from threading import Lock
from typing import List

# Limit thread counts to conserve memory on constrained platforms (e.g., Render/Koyeb free tiers)
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

from src.backend_python.config import config

_st_model = None
_inference_lock = Lock()

def get_embedding_model():
    global _st_model
    if _st_model is None:
        # If USE_FALLBACK_EMBEDDINGS=true, skip model download entirely
        # This is necessary on Render/Koyeb free tier (512MB RAM) to prevent OOM crash
        if config.USE_FALLBACK_EMBEDDINGS:
            print("[EduMind] Using built-in term-hash embeddings.")
            _st_model = "fallback"
            return _st_model
        try:
            from fastembed import TextEmbedding
            print(f"Loading embedding model: {config.EMBEDDING_MODEL}...")
            _st_model = TextEmbedding(
                model_name=config.EMBEDDING_MODEL,
                threads=1,
                enable_cpu_mem_arena=False,
            )
            print("Embedding model loaded successfully.")
        except Exception as e:
            print(f"Warning: Could not load SentenceTransformer ({e}). Using deterministic fallback embeddings.")
            _st_model = "fallback"
    return _st_model


def search_terms(text: str) -> List[str]:
    stop_words = {"a", "an", "and", "are", "can", "do", "does", "for", "how", "in", "is", "of", "on", "the", "to", "what", "when", "where", "which", "who", "why", "with", "you"}
    return [word for word in re.findall(r"[^\W_]+", text.casefold()) if word not in stop_words]


def fallback_embedding(text: str, dim: int = 384) -> List[float]:
    """Vectorize whole terms using deterministic signed feature hashing."""
    vec = [0.0] * dim
    for word in search_terms(text):
        digest = blake2b(word.encode("utf-8"), digest_size=8).digest()
        vec[int.from_bytes(digest, "little") % dim] += 1 if digest[0] & 1 else -1

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec

def generate_embeddings(texts: List[str], query: bool = False) -> tuple[str, List[List[float]]]:
    # One inference at a time keeps concurrent uploads and queries within the service memory budget.
    with _inference_lock:
        model = get_embedding_model()
        if model != "fallback" and model is not None:
            try:
                vectors = model.query_embed(texts, batch_size=1) if query else model.embed(texts, batch_size=1)
                return config.EMBEDDING_MODEL, [vector.tolist() for vector in vectors]
            except Exception as e:
                print(f"Error encoding with FastEmbed: {e}")

    return "term-hash-v2", [fallback_embedding(text) for text in texts]

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return dot / (norm_a * norm_b)
