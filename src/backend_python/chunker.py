from typing import List, Dict, Any
import uuid
from src.backend_python.config import config

def chunk_document(doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    chunks: List[Dict[str, Any]] = []
    doc_id = doc["doc_id"]
    chat_id = doc["chat_id"]
    file_name = doc["file_name"]
    file_type = doc["file_type"]
    pages = doc.get("pages", [])

    chunk_size = max(1, config.CHUNK_SIZE)
    chunk_overlap = min(max(0, config.CHUNK_OVERLAP), chunk_size - 1)
    global_chunk_index = 0

    for page_idx, page in enumerate(pages):
        page_num = page.get("page_number")
        section = page.get("section")
        text = page.get("text", "").strip()

        if not text:
            continue

        # Split text into sentences/paragraphs
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [text]

        page_chunks: List[str] = []
        text = "\n\n".join(paragraphs)
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            if end < len(text):
                earliest_break = start + max(chunk_overlap + 1, chunk_size // 2)
                paragraph_break = text.rfind("\n\n", earliest_break, end)
                word_break = text.rfind(" ", earliest_break, end)
                end = paragraph_break if paragraph_break >= 0 else word_break if word_break >= 0 else end
            piece = text[start:end].strip()
            if piece:
                page_chunks.append(piece)
            if end == len(text):
                break
            start = max(start + 1, end - chunk_overlap)

        for c_text in page_chunks:
            # Build context header for enriched text
            context_header = f"Document: {file_name}"
            if page_num:
                context_header += f" | Page: {page_num}"
            if section:
                context_header += f" | Section: {section}"

            enriched_text = f"[{context_header}]\n{c_text}"

            chunk_id = f"chk_{uuid.uuid4().hex[:12]}"

            chunks.append({
                "chunk_id": chunk_id,
                "chat_id": chat_id,
                "document_id": doc_id,
                "document_name": file_name,
                "file_type": file_type,
                "page_number": page_num,
                "section": section,
                "chunk_index": global_chunk_index,
                "text": c_text,
                "enriched_text": enriched_text
            })

            global_chunk_index += 1

    return chunks
