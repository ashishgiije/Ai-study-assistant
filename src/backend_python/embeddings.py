import math
from typing import List
from src.backend_python.config import config

_st_model = None

def get_sentence_transformer():
    global _st_model
    if _st_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print(f"Loading embedding model: {config.EMBEDDING_MODEL}...")
            _st_model = SentenceTransformer(config.EMBEDDING_MODEL)
            print("Embedding model loaded successfully.")
        except Exception as e:
            print(f"Warning: Could not load SentenceTransformer ({e}). Using deterministic fallback embeddings.")
            _st_model = "fallback"
    return _st_model

def fallback_embedding(text: str, dim: int = 384) -> List[float]:
    """Generates a normalized 384-dim embedding from text hash features."""
    vec = [0.0] * dim
    clean = text.lower().strip()
    words = clean.split()

    for idx, word in enumerate(words):
        for char_idx, char in enumerate(word):
            h = (ord(char) * 31 + idx * 17 + char_idx * 7) % dim
            vec[h] += 1.0 / (char_idx + 1)

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]
    return vec

def generate_embedding(text: str) -> List[float]:
    model = get_sentence_transformer()
    if model != "fallback" and model is not None:
        try:
            emb = model.encode(text, normalize_embeddings=True)
            return emb.tolist()
        except Exception as e:
            print(f"Error encoding with SentenceTransformer: {e}")

    return fallback_embedding(text)

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return dot / (norm_a * norm_b)
