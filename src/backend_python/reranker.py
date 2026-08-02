import re
from typing import List, Dict, Any

_cross_encoder_model = None

def get_cross_encoder():
    global _cross_encoder_model
    if _cross_encoder_model is None:
        try:
            from sentence_transformers import CrossEncoder
            print("Loading cross-encoder reranker model: cross-encoder/ms-marco-MiniLM-L-6-v2...")
            _cross_encoder_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            print("Cross-encoder model loaded successfully.")
        except Exception as e:
            print(f"Warning: Could not load CrossEncoder model ({e}). Using hybrid keyword+vector reranker.")
            _cross_encoder_model = "fallback"
    return _cross_encoder_model

def rerank_chunks(
    query: str,
    chunks: List[Dict[str, Any]],
    top_n: int = 5,
    min_relevance_score: float = 0.12
) -> Dict[str, Any]:
    if not chunks:
        return {"is_relevant": False, "chunks": [], "max_score": 0.0}

    model = get_cross_encoder()

    if model != "fallback" and model is not None:
        try:
            pairs = [[query, chunk.get("text", "") + " " + (chunk.get("section") or "")] for chunk in chunks]
            scores = model.predict(pairs)

            reranked = []
            for chunk, score in zip(chunks, scores):
                # Sigmoid normalization for raw logits if needed
                norm_score = float(1.0 / (1.0 + pow(2.71828, -float(score))))
                chunk_copy = dict(chunk)
                chunk_copy["score"] = norm_score
                reranked.append(chunk_copy)

            reranked.sort(key=lambda x: x["score"], reverse=True)
            top_chunks = reranked[:top_n]
            max_score = top_chunks[0]["score"] if top_chunks else 0.0
            is_relevant = max_score >= min_relevance_score

            return {
                "is_relevant": is_relevant,
                "chunks": top_chunks if is_relevant else [],
                "max_score": max_score
            }
        except Exception as e:
            print(f"CrossEncoder scoring error ({e}), falling back to hybrid reranker.")

    # Fallback Hybrid Keyword + Vector Reranker
    query_terms = [t for t in re.findall(r"\w+", query.lower()) if len(t) > 2]
    reranked = []

    for chunk in chunks:
        base_score = float(chunk.get("score", 0.0))
        text_lower = (chunk.get("text", "") + " " + (chunk.get("section") or "")).lower()

        matched_terms = sum(1 for term in query_terms if term in text_lower)
        coverage_ratio = (matched_terms / len(query_terms)) if query_terms else 0.0

        final_score = base_score * 0.6 + coverage_ratio * 0.4
        chunk_copy = dict(chunk)
        chunk_copy["score"] = final_score
        reranked.append(chunk_copy)

    reranked.sort(key=lambda x: x["score"], reverse=True)
    top_chunks = reranked[:top_n]
    max_score = top_chunks[0]["score"] if top_chunks else 0.0
    is_relevant = max_score >= min_relevance_score

    return {
        "is_relevant": is_relevant,
        "chunks": top_chunks if is_relevant else [],
        "max_score": max_score
    }
