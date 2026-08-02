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

    chunk_size = config.CHUNK_SIZE  # 900
    chunk_overlap = config.CHUNK_OVERLAP  # 150
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

        current_chunk = ""
        page_chunks: List[str] = []

        for p in paragraphs:
            if not current_chunk:
                current_chunk = p
            elif len(current_chunk) + len(p) + 2 <= chunk_size:
                current_chunk += "\n\n" + p
            else:
                page_chunks.append(current_chunk)

                # Maintain overlap from end of current_chunk
                if len(current_chunk) > chunk_overlap:
                    overlap_text = current_chunk[-chunk_overlap:]
                    # Try to break on space
                    space_idx = overlap_text.find(" ")
                    if space_idx != -1:
                        overlap_text = overlap_text[space_idx + 1:]
                    current_chunk = overlap_text + "\n\n" + p
                else:
                    current_chunk = p

        if current_chunk.strip():
            page_chunks.append(current_chunk.strip())

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
