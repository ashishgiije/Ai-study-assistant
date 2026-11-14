import os
import json
import hashlib
import tempfile
import time
from threading import RLock
from typing import List, Dict, Any, Optional
from src.backend_python.config import config
from src.backend_python.embeddings import generate_embeddings, cosine_similarity, fallback_embedding, search_terms

VECTOR_DB_FILE = os.path.abspath(os.getenv("VECTOR_STORE_PATH", "edumind_vectors.json"))


def qdrant_error_summary(error: Exception) -> str:
    status = getattr(error, "status_code", None)
    if isinstance(status, int):
        return f"HTTP {status}"
    return type(error).__name__


def string_to_uuid(s: str) -> str:
    h = hashlib.sha256(s.encode("utf-8")).hexdigest()
    return f"{h[:8]}-{h[8:12]}-4{h[13:16]}-8{h[17:20]}-{h[20:32]}"

class VectorStoreService:
    def __init__(self):
        self.memory_store: List[Dict[str, Any]] = []
        self._local_lock = RLock()
        self.load_memory_store()
        self.client = None
        self.qdrant_enabled = False
        self._qdrant_initialized = False
        self._qdrant_retry_at = 0.0

    def _init_qdrant_lazy(self):
        if not config.QDRANT_URL or self._qdrant_initialized or time.monotonic() < self._qdrant_retry_at:
            return
        with self._local_lock:
            if self._qdrant_initialized or time.monotonic() < self._qdrant_retry_at:
                return
            try:
                from qdrant_client import QdrantClient
                self.client = QdrantClient(
                    url=config.QDRANT_URL.strip(),
                    api_key=config.QDRANT_API_KEY.strip() or None,
                    timeout=3.0,
                    check_compatibility=False,
                )
                self._ensure_collection()
                self.qdrant_enabled = True
                self._qdrant_initialized = True
                print("[EduMind VectorStore] Connected to Qdrant Cloud.")
            except Exception as e:
                self.client = None
                self._qdrant_retry_at = time.monotonic() + 60
                print(f"[EduMind VectorStore] Qdrant connection or collection setup failed ({qdrant_error_summary(e)}); using local vectors.")


    def load_memory_store(self):
        if os.path.exists(VECTOR_DB_FILE):
            try:
                with open(VECTOR_DB_FILE, "r", encoding="utf-8") as f:
                    self.memory_store = json.load(f)
            except Exception as e:
                print(f"Error loading local vector file: {e}")
                self.memory_store = []

    def save_memory_store(self, points):
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=os.path.dirname(VECTOR_DB_FILE), delete=False) as f:
                temp_path = f.name
                json.dump(points, f, separators=(",", ":"))
            os.replace(temp_path, VECTOR_DB_FILE)
        finally:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
        self.memory_store = points

    def _ensure_collection(self):
        if not self.client:
            return
        from qdrant_client.http import models

        name = config.QDRANT_COLLECTION
        if not self.client.collection_exists(name):
            self.client.create_collection(
                collection_name=name,
                vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
            )
        collection = self.client.get_collection(name)
        vectors = collection.config.params.vectors
        if not isinstance(vectors, models.VectorParams) or vectors.size != 384 or vectors.distance != models.Distance.COSINE:
            print("[EduMind VectorStore] Qdrant collection requires one unnamed 384-dimensional cosine vector.")
            raise ValueError("Incompatible Qdrant collection")
        for field in ("chat_id", "document_id", "embedding_kind"):
            if field not in collection.payload_schema:
                self.client.create_payload_index(
                    collection_name=name,
                    field_name=field,
                    field_schema=models.PayloadSchemaType.KEYWORD,
                    wait=True,
                )

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        if not chunks:
            return

        points = []
        embedding_kind, vectors = generate_embeddings([chunk["enriched_text"] for chunk in chunks])
        for chunk, vector in zip(chunks, vectors):
            point = {
                "id": chunk["chunk_id"],
                "vector": vector,
                "payload": {
                    "embedding_kind": embedding_kind,
                    "chat_id": chunk["chat_id"],
                    "document_id": chunk["document_id"],
                    "document_name": chunk["document_name"],
                    "file_type": chunk["file_type"],
                    "page_number": chunk.get("page_number"),
                    "section": chunk.get("section"),
                    "chunk_id": chunk["chunk_id"],
                    "chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "enriched_text": chunk["enriched_text"]
                }
            }
            points.append(point)

        # 1. Update local memory store
        chunk_ids = set(c["chunk_id"] for c in chunks)
        with self._local_lock:
            self.save_memory_store([p for p in self.memory_store if p["id"] not in chunk_ids] + points)

        # 2. Add to Qdrant Cloud if active
        if embedding_kind != "term-hash-v2":
            self._init_qdrant_lazy()
        if self.qdrant_enabled and embedding_kind != "term-hash-v2":
            try:
                from qdrant_client.http import models
                qdrant_points = [
                    models.PointStruct(
                        id=string_to_uuid(p["id"]),
                        vector=p["vector"],
                        payload=p["payload"]
                    ) for p in points
                ]
                self.client.upsert(
                    collection_name=config.QDRANT_COLLECTION,
                    points=qdrant_points,
                    wait=True,
                )
                print(f"[EduMind VectorStore] Qdrant stored {len(qdrant_points)} chunk(s).")
            except Exception as e:
                print(f"[EduMind VectorStore] Qdrant upsert failed ({qdrant_error_summary(e)}).")

    def search(self, current_chat_id: str, query: str, document_id: Optional[str] = None, top_k: int = 10) -> List[Dict[str, Any]]:
        if not current_chat_id:
            raise ValueError("Search failed: chat_id filter is strictly required")

        embedding_kind, (query_vector,) = generate_embeddings([query], query=True)


        # Try Qdrant search if enabled
        if embedding_kind != "term-hash-v2":
            self._init_qdrant_lazy()
        if self.qdrant_enabled and embedding_kind != "term-hash-v2":
            try:
                from qdrant_client.http import models
                must_conditions = [models.FieldCondition(key="chat_id", match=models.MatchValue(value=current_chat_id))]
                must_conditions.append(models.FieldCondition(key="embedding_kind", match=models.MatchValue(value=embedding_kind)))
                if document_id:
                    must_conditions.append(models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id)))
                
                qdrant_res = self.client.query_points(
                    collection_name=config.QDRANT_COLLECTION,
                    query=query_vector,
                    query_filter=models.Filter(must=must_conditions),
                    limit=top_k
                ).points

                if qdrant_res:
                    print(f"[EduMind VectorStore] Qdrant retrieved {len(qdrant_res)} chunk(s).")
                    return [
                        {
                            "chunk_id": res.payload.get("chunk_id", res.id),
                            "chat_id": res.payload["chat_id"],
                            "document_id": res.payload["document_id"],
                            "document_name": res.payload["document_name"],
                            "file_type": res.payload["file_type"],
                            "page_number": res.payload.get("page_number"),
                            "section": res.payload.get("section"),
                            "chunk_index": res.payload["chunk_index"],
                            "text": res.payload["text"],
                            "enriched_text": res.payload["enriched_text"],
                            "score": res.score,
                            "dense_score": res.score,
                        }
                        for res in qdrant_res
                    ]
            except Exception as e:
                print(f"[EduMind VectorStore] Qdrant search failed ({qdrant_error_summary(e)}); using local vectors.")

        # Local fallback: filter points for the current chat (and optional document)
        isolated_points = [p for p in self.memory_store if p["payload"]["chat_id"] == current_chat_id]
        if document_id:
            isolated_points = [p for p in isolated_points if p["payload"]["document_id"] == document_id]

        if not isolated_points:
            return []  # No vectors for this chat/document

        # Compute cosine similarity for each candidate
        scored_points = []
        query_terms = set(search_terms(query))
        for p in isolated_points:
            payload = p["payload"]
            vector = p["vector"]
            stored_kind = payload.get("embedding_kind")
            if stored_kind == embedding_kind:
                similarity = cosine_similarity(query_vector, vector)
            elif embedding_kind == "term-hash-v2":
                similarity = cosine_similarity(query_vector, fallback_embedding(payload["enriched_text"]))
            else:
                similarity = 0.0
            if query_terms:
                coverage = len(query_terms & set(search_terms(payload["text"]))) / len(query_terms)
                if embedding_kind == "term-hash-v2" or stored_kind != embedding_kind:
                    similarity = max(0, similarity) * 0.4 + coverage * 0.6
            scored_points.append({"point": p, "score": similarity})

        # Use nlargest for efficient top‑k selection
        from heapq import nlargest
        top_scored = nlargest(top_k, scored_points, key=lambda x: x["score"])

        top_results = []
        for sp in top_scored:
            payload = sp["point"]["payload"]
            top_results.append({
                "chunk_id": payload["chunk_id"],
                "chat_id": payload["chat_id"],
                "document_id": payload["document_id"],
                "document_name": payload["document_name"],
                "file_type": payload["file_type"],
                "page_number": payload.get("page_number"),
                "section": payload.get("section"),
                "chunk_index": payload["chunk_index"],
                "text": payload["text"],
                "enriched_text": payload["enriched_text"],
                "score": sp["score"],
                **({"dense_score": sp["score"]} if embedding_kind != "term-hash-v2"
                   and payload.get("embedding_kind") == embedding_kind else {}),
            })

        return top_results

    def delete_document_vectors(self, chat_id: str, document_id: str):
        if not config.USE_FALLBACK_EMBEDDINGS:
            self._init_qdrant_lazy()
        with self._local_lock:
            self.save_memory_store([
                p for p in self.memory_store
                if not (p["payload"].get("chat_id") == chat_id and p["payload"].get("document_id") == document_id)
            ])

        if self.client:
            try:
                from qdrant_client.http import models
                self.client.delete(
                    collection_name=config.QDRANT_COLLECTION,
                    points_selector=models.FilterSelector(
                        filter=models.Filter(
                            must=[
                                models.FieldCondition(key="chat_id", match=models.MatchValue(value=chat_id)),
                                models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id))
                            ]
                        )
                    )
                )
            except Exception as e:
                print(f"[EduMind VectorStore] Qdrant document delete failed ({qdrant_error_summary(e)}).")

    def delete_chat_vectors(self, chat_id: str):
        if not config.USE_FALLBACK_EMBEDDINGS:
            self._init_qdrant_lazy()
        with self._local_lock:
            self.save_memory_store([
                p for p in self.memory_store
                if p["payload"].get("chat_id") != chat_id
            ])


        if self.client:
            try:
                from qdrant_client.http import models
                self.client.delete(
                    collection_name=config.QDRANT_COLLECTION,
                    points_selector=models.FilterSelector(
                        filter=models.Filter(
                            must=[
                                models.FieldCondition(key="chat_id", match=models.MatchValue(value=chat_id))
                            ]
                        )
                    )
                )
            except Exception as e:
                print(f"[EduMind VectorStore] Qdrant chat delete failed ({qdrant_error_summary(e)}).")

vector_store = VectorStoreService()
