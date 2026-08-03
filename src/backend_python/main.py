import os
import shutil
import uuid
import time
import random
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    print("[EduMind Python Backend] Pre-loading embedding model and initializing vector store...")
    try:
        from src.backend_python.embeddings import get_sentence_transformer
        get_sentence_transformer()
    except Exception as e:
        print(f"[EduMind Python Backend] Model warm-up warning: {e}")

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
    return db_service.get_documents(chat_id)

@app.post("/api/chats/{chat_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_documents(chat_id: str, files: List[UploadFile] = File(...)):
    """Upload one or more documents, extract text, chunk, embed and index.

    Returns a summary with the number of processed documents and their DB records.
    """
    chat = db_service.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    chat_upload_dir = os.path.join(upload_root_dir, chat_id)
    os.makedirs(chat_upload_dir, exist_ok=True)

    uploaded_documents = []

    for file in files:
        file_ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
        if file_ext not in ["pdf", "docx", "txt"]:
            continue

        doc_id = f"doc_{uuid.uuid4().hex[:9]}_{int(time.time() * 1000)}"
        filename_prefix = f"{int(uuid.uuid4().int % 1000000)}-{file.filename}"
        saved_file_path = os.path.join(chat_upload_dir, filename_prefix)

        # Save file content to disk
        contents = await file.read()
        with open(saved_file_path, "wb") as f:
            f.write(contents)

        file_size = len(contents)

        doc_record = db_service.add_document(
            doc_id=doc_id,
            chat_id=chat_id,
            file_name=file.filename,
            file_type=file_ext,
            file_path=saved_file_path,
            file_size=file_size,
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
            vector_store.add_chunks(chunks)
            updated_doc = db_service.update_document_status(doc_id, "indexed", len(chunks))
            if updated_doc:
                uploaded_documents.append(updated_doc)
        except Exception as proc_err:
            print(f"Error processing document {file.filename}: {proc_err}")
            failed_doc = db_service.update_document_status(
                doc_id,
                "failed",
                0,
                str(proc_err) or "Processing error",
            )
            if failed_doc:
                uploaded_documents.append(failed_doc)

    return {
        "message": f"{len(uploaded_documents)} document(s) uploaded and processed successfully",
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
