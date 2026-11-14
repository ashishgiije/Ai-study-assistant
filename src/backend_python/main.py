import os
import shutil
import uuid
import time
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.backend_python.config import config
from src.backend_python.db import db_service
from src.backend_python.document_processor import extract_document_text
from src.backend_python.chunker import chunk_document
from src.backend_python.vector_store import vector_store
from src.backend_python.rag_pipeline import process_question

app = FastAPI(title="EduMind AI FastAPI Backend", version="1.0.0")
logger = logging.getLogger(__name__)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure root upload directory
upload_root_dir = os.path.abspath(config.UPLOAD_DIRECTORY)
os.makedirs(upload_root_dir, exist_ok=True)



class CreateChatRequest(BaseModel):
    title: Optional[str] = "New Study Session"

class UpdateChatRequest(BaseModel):
    title: str

class PostMessageRequest(BaseModel):
    question: str
    document_id: Optional[str] = None

def extract_user_id(x_user_id: Optional[str] = None, authorization: Optional[str] = None) -> str:
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()
    if authorization and authorization.strip():
        token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
        if token:
            return token
    return "default_user"

@app.get("/health")
def health_check():
    return {"status": "ok", "app": "EduMind AI (FastAPI)", "port": config.PORT}

@app.get("/api/chats")
def get_all_chats(
    x_user_id: Optional[str] = Header(None, alias="x-user-id"),
    authorization: Optional[str] = Header(None, alias="authorization")
):
    user_id = extract_user_id(x_user_id, authorization)
    chats = db_service.get_chats(user_id=user_id)
    if not chats:
        clean_user = user_id.replace("-", "_").replace(":", "_")
        default_chat_id = f"chat_welcome_{clean_user}"
        db_service.create_chat(
            chat_id=default_chat_id,
            title="Welcome & Introduction",
            user_id=user_id
        )
        db_service.add_message(
            chat_id=default_chat_id,
            role="assistant",
            content="Hello! I am **EduMind AI**, your personal AI study assistant. Upload lecture notes, PDFs, or study guides using the upload button on the left, or ask any question to get started!",
            sources=[],
            suggested_questions=[
                "How does EduMind AI help me study?",
                "What file types can I upload?",
                "How do citations work in study answers?"
            ]
        )
        chats = db_service.get_chats(user_id=user_id)
    return chats

@app.post("/api/chats", status_code=status.HTTP_201_CREATED)
def create_chat(
    req: Optional[CreateChatRequest] = Body(default=None),
    x_user_id: Optional[str] = Header(None, alias="x-user-id"),
    authorization: Optional[str] = Header(None, alias="authorization")
):
    user_id = extract_user_id(x_user_id, authorization)
    chat_id = f"chat_{uuid.uuid4().hex[:9]}_{int(time.time() * 1000)}"
    title = (req.title if req and req.title else "New Study Session")
    new_chat = db_service.create_chat(chat_id, title, user_id=user_id)
    return new_chat

@app.get("/api/chats/{chat_id}")
def get_chat(
    chat_id: str,
    x_user_id: Optional[str] = Header(None, alias="x-user-id"),
    authorization: Optional[str] = Header(None, alias="authorization")
):
    user_id = extract_user_id(x_user_id, authorization)
    chat = db_service.get_chat(chat_id, user_id=user_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat

@app.patch("/api/chats/{chat_id}")
def update_chat(
    chat_id: str,
    req: UpdateChatRequest,
    x_user_id: Optional[str] = Header(None, alias="x-user-id"),
    authorization: Optional[str] = Header(None, alias="authorization")
):
    if not req.title or not req.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    user_id = extract_user_id(x_user_id, authorization)
    updated = db_service.update_chat(chat_id, req.title.strip(), user_id=user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Chat not found")
    return updated

@app.delete("/api/chats/{chat_id}")
def delete_chat(
    chat_id: str,
    x_user_id: Optional[str] = Header(None, alias="x-user-id"),
    authorization: Optional[str] = Header(None, alias="authorization")
):
    user_id = extract_user_id(x_user_id, authorization)
    chat, deleted_docs = db_service.delete_chat(chat_id, user_id=user_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # 1. Delete Qdrant vectors matching chat_id
    vector_store.delete_chat_vectors(chat_id)

    # 2. Delete upload files directory for this chat
    chat_upload_dir = os.path.join(upload_root_dir, chat_id)
    if os.path.exists(chat_upload_dir):
        try:
            shutil.rmtree(chat_upload_dir, ignore_errors=True)
        except Exception as e:
            print(f"Error removing chat upload directory: {e}")

    return {"message": "Chat and all associated documents deleted successfully", "chatId": chat_id}

@app.get("/api/chats/{chat_id}/messages")
def get_messages(chat_id: str):
    return db_service.get_messages(chat_id)

@app.post("/api/chats/{chat_id}/messages")
def post_message(chat_id: str, req: PostMessageRequest):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question content is required")

    result = process_question(chat_id, req.question.strip(), document_id=req.document_id)
    return result

@app.get("/api/chats/{chat_id}/documents")
def get_documents(chat_id: str):
    try:
        return db_service.get_documents(chat_id)
    except Exception as e:
        print(f"Error fetching documents for chat {chat_id}: {e}")
        return []

@app.post("/api/chats/{chat_id}/documents", status_code=status.HTTP_201_CREATED)
def upload_documents(
    chat_id: str,
    files: List[UploadFile] = File(...),
    x_user_id: Optional[str] = Header(None, alias="x-user-id"),
    authorization: Optional[str] = Header(None, alias="authorization")
):
    """Upload one or more documents, extract text, chunk, embed and index."""
    user_id = extract_user_id(x_user_id, authorization)
    chat = db_service.get_chat(chat_id, user_id=user_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    file_types = [Path(file.filename or "").suffix.lower().lstrip(".") for file in files]
    if not files or any(ext not in {"pdf", "docx", "txt"} for ext in file_types):
        raise HTTPException(status_code=415, detail="Choose PDF, DOCX, or TXT files.")
    limit = config.MAX_FILE_SIZE_MB * 1024 * 1024
    if any(file.size is None or file.size > limit for file in files):
        raise HTTPException(status_code=413, detail=f"Each file must be at most {config.MAX_FILE_SIZE_MB} MB.")

    upload_root = Path(upload_root_dir).resolve()
    chat_upload_dir = (upload_root / chat_id).resolve()
    if chat_upload_dir.parent != upload_root:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    chat_upload_dir.mkdir(exist_ok=True)

    uploaded_documents = []

    for file, file_ext in zip(files, file_types):
        doc_id = f"doc_{uuid.uuid4().hex[:9]}_{int(time.time() * 1000)}"
        saved_file_path = str(chat_upload_dir / f"{doc_id}.{file_ext}")

        with open(saved_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f, length=1024 * 1024)

        doc_record = db_service.add_document(
            doc_id=doc_id,
            chat_id=chat_id,
            file_name=file.filename,
            file_type=file_ext,
            file_path=saved_file_path,
            file_size=file.size,
        )

        db_service.update_document_status(doc_id, "processing")

        try:
            processed_doc = extract_document_text(
                doc_id=doc_id,
                chat_id=chat_id,
                file_path=saved_file_path,
                file_name=file.filename,
                file_type=file_ext,
            )
            chunks = chunk_document(processed_doc)
            if not chunks:
                raise ValueError("No readable text found. For scanned PDFs, upload an OCR-processed copy.")
            vector_store.add_chunks(chunks)
            updated_doc = db_service.update_document_status(doc_id, "indexed", len(chunks))
            if updated_doc:
                uploaded_documents.append(updated_doc)
        except Exception as proc_err:
            if isinstance(proc_err, ValueError):
                logger.info("Document %s could not be indexed: %s", doc_id, proc_err)
            else:
                logger.exception("Indexing failed for %s", doc_id)
            failed_doc = db_service.update_document_status(
                doc_id,
                "failed",
                0,
                str(proc_err) if isinstance(proc_err, ValueError) else "Indexing failed. Remove this file and retry.",
            )
            if failed_doc:
                uploaded_documents.append(failed_doc)

    indexed_count = sum(doc["status"] == "indexed" for doc in uploaded_documents)
    return {
        "message": f"{indexed_count} of {len(uploaded_documents)} document(s) indexed.",
        "documents": uploaded_documents,
    }


@app.delete("/api/chats/{chat_id}/documents/{document_id}")
def delete_document(chat_id: str, document_id: str):
    doc = db_service.get_document(document_id)
    if not doc or doc.get("chat_id") != chat_id:
        raise HTTPException(status_code=404, detail="Document not found in this chat")

    # 1. Delete Qdrant vectors matching chat_id AND document_id
    vector_store.delete_document_vectors(chat_id, document_id)

    # 2. Delete database record
    db_service.delete_document(document_id)

    # 3. Delete file from disk
    file_path = doc.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error deleting file from disk: {e}")

    return {"message": "Document and vectors deleted successfully", "documentId": document_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)

