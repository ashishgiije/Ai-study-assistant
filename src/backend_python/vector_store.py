import os
import json
import hashlib
from typing import List, Dict, Any, Optional
from src.backend_python.config import config
from src.backend_python.embeddings import generate_embedding, cosine_similarity

VECTOR_DB_FILE = os.path.join(os.getcwd(), "edumind_vectors.json")

def string_to_uuid(s: str) -> str:
    h = hashlib.sha256(s.encode("utf-8")).hexdigest()
    return f"{h[:8]}-{h[8:12]}-4{h[13:16]}-8{h[17:20]}-{h[20:32]}"

class VectorStoreService:
    def __init__(self):
        self.memory_store: List[Dict[str, Any]] = []
        self.load_memory_store()
        self.client = None
        self.qdrant_enabled = False

        if config.QDRANT_URL:
            try:
                from qdrant_client import QdrantClient
                from qdrant_client.http import models

                self.client = QdrantClient(
                    url=config.QDRANT_URL,
                    api_key=config.QDRANT_API_KEY or None
                )
                self._ensure_collection()
                self.qdrant_enabled = True
            except Exception as e:
                print(f"Qdrant Client initialization failed ({e}), using local vector store.")

    def load_memory_store(self):
        if os.path.exists(VECTOR_DB_FILE):
            try:
                with open(VECTOR_DB_FILE, "r", encoding="utf-8") as f:
                    self.memory_store = json.load(f)
            except Exception as e:
                print(f"Error loading local vector file: {e}")
                self.memory_store = []

    def save_memory_store(self):
        try:
            with open(VECTOR_DB_FILE, "w", encoding="utf-8") as f:
                json.dump(self.memory_store, f, indent=2)
        except Exception as e:
            print(f"Error saving local vector file: {e}")

    def _ensure_collection(self):
        if not self.client:
            return
        try:
            from qdrant_client.http import models
            collections = self.client.get_collections()
            exists = any(c.name == config.QDRANT_COLLECTION for c in collections.collections)
            if not exists:
                self.client.create_collection(
                    collection_name=config.QDRANT_COLLECTION,
                    vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE)
                )

            # Ensure payload indexes
            try:
                self.client.create_payload_index(
                    collection_name=config.QDRANT_COLLECTION,
                    field_name="chat_id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
            except Exception:
                pass

            try:
                self.client.create_payload_index(
                    collection_name=config.QDRANT_COLLECTION,
                    field_name="document_id",
                    field_schema=models.PayloadSchemaType.KEYWORD
                )
            except Exception:
                pass
        except Exception as e:
            print(f"Qdrant collection check failed: {e}")

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        if not chunks:
            return

        points = []
        for chunk in chunks:
            vector = generate_embedding(chunk["enriched_text"])
            point = {
                "id": chunk["chunk_id"],
                "vector": vector,
                "payload": {
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
        self.memory_store = [p for p in self.memory_store if p["id"] not in chunk_ids]
        self.memory_store.extend(points)
        self.save_memory_store()

        # 2. Add to Qdrant Cloud if active
        if self.qdrant_enabled:
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
                    points=qdrant_points
                )
            except Exception as e:
                print(f"Qdrant upsert error: {e}")

    def search(self, current_chat_id: str, query: str, document_id: Optional[str] = None, top_k: int = 10) -> List[Dict[str, Any]]:
        if not current_chat_id:
            raise ValueError("Search failed: chat_id filter is strictly required")

        query_vector = generate_embedding(query)

        # Try Qdrant search if enabled
        if self.qdrant_enabled:
            try:
                from qdrant_client.http import models
                must_conditions = [models.FieldCondition(key="chat_id", match=models.MatchValue(value=current_chat_id))]
                if document_id:
                    must_conditions.append(models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id)))
                
                qdrant_res = self.client.query_points(
                    collection_name=config.QDRANT_COLLECTION,
                    vector=query_vector,
                    query_filter=models.Filter(must=must_conditions),
                    limit=top_k
                ).points

                if qdrant_res:
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
                            "score": res.score
                        }
                        for res in qdrant_res
                    ]
            except Exception as e:
                print(f"Qdrant search error, falling back to local memory store: {e}")

        # Local fallback: filter points for the current chat (and optional document)
        isolated_points = [p for p in self.memory_store if p["payload"]["chat_id"] == current_chat_id]
        if document_id:
            isolated_points = [p for p in isolated_points if p["payload"]["document_id"] == document_id]

        if not isolated_points:
            return []  # No vectors for this chat/document

        # Compute cosine similarity for each candidate
        scored_points = []
        for p in isolated_points:
            similarity = cosine_similarity(query_vector, p["vector"])
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
            })

        return top_results

    def delete_document_vectors(self, chat_id: str, document_id: str):
        self.memory_store = [
            p for p in self.memory_store
            if not (p["payload"].get("chat_id") == chat_id and p["payload"].get("document_id") == document_id)
        ]
        self.save_memory_store()

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
                print(f"Qdrant delete document vectors error: {e}")

    def delete_chat_vectors(self, chat_id: str):
        self.memory_store = [
            p for p in self.memory_store
            if p["payload"].get("chat_id") != chat_id
        ]
        self.save_memory_store()

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
                print(f"Qdrant delete chat vectors error: {e}")

vector_store = VectorStoreService()
