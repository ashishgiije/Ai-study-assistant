import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, ForeignKey, JSON, text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from src.backend_python.config import config

engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False} if config.DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ChatModel(Base):
    __tablename__ = "chats"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True, default="default_user")
    title = Column(String, nullable=False, default="New Study Session")
    created_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)

    messages = relationship("MessageModel", back_populates="chat", cascade="all, delete-orphan")
    documents = relationship("DocumentModel", back_populates="chat", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id or "default_user",
            "title": self.title,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "documents": [doc.to_dict() for doc in self.documents],
            "messages": [msg.to_dict() for msg in self.messages]
        }

class MessageModel(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, index=True)
    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)
    suggested_questions = Column(JSON, nullable=True)
    created_at = Column(String, nullable=False)

    chat = relationship("ChatModel", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "chat_id": self.chat_id,
            "role": self.role,
            "content": self.content,
            "sources": self.sources if self.sources is not None else [],
            "suggested_questions": self.suggested_questions if self.suggested_questions is not None else [],
            "created_at": self.created_at
        }

class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    chat_id = Column(String, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="queued")
    chunk_count = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(String, nullable=False)
    processed_at = Column(String, nullable=True)

    chat = relationship("ChatModel", back_populates="documents")

    def to_dict(self):
        return {
            "id": self.id,
            "chat_id": self.chat_id,
            "file_name": self.file_name,
            "file_type": self.file_type,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "status": self.status,
            "chunk_count": self.chunk_count,
            "error_message": self.error_message,
            "created_at": self.created_at,
            "processed_at": self.processed_at
        }

# Create tables if not present
Base.metadata.create_all(bind=engine)

def _migrate_db():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(chats)"))
            columns = [row[1] for row in result.fetchall()]
            if "user_id" not in columns:
                print("Migrating SQLite DB: Adding user_id column to chats table...")
                conn.execute(text("ALTER TABLE chats ADD COLUMN user_id VARCHAR DEFAULT 'default_user'"))
                conn.commit()
    except Exception as e:
        print("SQLite migration notice:", e)

_migrate_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DBService:
    def get_chats(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            query = db.query(ChatModel)
            if user_id:
                query = query.filter(ChatModel.user_id == user_id)
            chats = query.order_by(ChatModel.updated_at.desc()).all()
            return [c.to_dict() for c in chats]
        finally:
            db.close()

    def get_chat(self, chat_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            query = db.query(ChatModel).filter(ChatModel.id == chat_id)
            if user_id:
                query = query.filter(ChatModel.user_id == user_id)
            chat = query.first()
            return chat.to_dict() if chat else None
        finally:
            db.close()

    def create_chat(self, chat_id: str, title: str = "New Study Session", user_id: Optional[str] = "default_user") -> Dict[str, Any]:
        db = SessionLocal()
        try:
            now = datetime.utcnow().isoformat() + "Z"
            chat = ChatModel(id=chat_id, user_id=user_id or "default_user", title=title, created_at=now, updated_at=now)
            db.add(chat)
            db.commit()
            db.refresh(chat)
            return chat.to_dict()
        finally:
            db.close()

    def update_chat(self, chat_id: str, title: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            query = db.query(ChatModel).filter(ChatModel.id == chat_id)
            if user_id:
                query = query.filter(ChatModel.user_id == user_id)
            chat = query.first()
            if not chat:
                return None
            chat.title = title
            chat.updated_at = datetime.utcnow().isoformat() + "Z"
            db.commit()
            db.refresh(chat)
            return chat.to_dict()
        finally:
            db.close()

    def delete_chat(self, chat_id: str, user_id: Optional[str] = None):
        db = SessionLocal()
        try:
            query = db.query(ChatModel).filter(ChatModel.id == chat_id)
            if user_id:
                query = query.filter(ChatModel.user_id == user_id)
            chat = query.first()
            if not chat:
                return None, []
            
            docs = [doc.to_dict() for doc in chat.documents]
            db.delete(chat)
            db.commit()
            return chat, docs
        finally:
            db.close()

    def get_messages(self, chat_id: str) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            messages = db.query(MessageModel).filter(MessageModel.chat_id == chat_id).order_by(MessageModel.created_at.asc()).all()
            return [m.to_dict() for m in messages]
        finally:
            db.close()

    def add_message(
        self,
        chat_id: str,
        role: str,
        content: str,
        sources: Optional[List[Dict[str, Any]]] = None,
        suggested_questions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            now = datetime.utcnow().isoformat() + "Z"
            msg_id = f"msg_{datetime.utcnow().timestamp()}_{chat_id[:6]}"
            msg = MessageModel(
                id=msg_id,
                chat_id=chat_id,
                role=role,
                content=content,
                sources=sources or [],
                suggested_questions=suggested_questions or [],
                created_at=now
            )
            db.add(msg)

            # Update chat updated_at
            chat = db.query(ChatModel).filter(ChatModel.id == chat_id).first()
            if chat:
                chat.updated_at = now
                if chat.title == "New Study Session" and role == "user":
                    clean_text = content.strip()
                    chat.title = clean_text[:40] + ("..." if len(clean_text) > 40 else "")

            db.commit()
            db.refresh(msg)
            return msg.to_dict()
        finally:
            db.close()

    def get_documents(self, chat_id: str) -> List[Dict[str, Any]]:
        db = SessionLocal()
        try:
            docs = db.query(DocumentModel).filter(DocumentModel.chat_id == chat_id).all()
            return [d.to_dict() for d in docs]
        finally:
            db.close()

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
            return doc.to_dict() if doc else None
        finally:
            db.close()

    def add_document(
        self,
        doc_id: str,
        chat_id: str,
        file_name: str,
        file_type: str,
        file_path: str,
        file_size: int
    ) -> Dict[str, Any]:
        db = SessionLocal()
        try:
            now = datetime.utcnow().isoformat() + "Z"
            doc = DocumentModel(
                id=doc_id,
                chat_id=chat_id,
                file_name=file_name,
                file_type=file_type,
                file_path=file_path,
                file_size=file_size,
                status="queued",
                chunk_count=0,
                created_at=now
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            return doc.to_dict()
        finally:
            db.close()

    def update_document_status(
        self,
        doc_id: str,
        status: str,
        chunk_count: int = 0,
        error_message: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
            if not doc:
                return None
            doc.status = status
            doc.chunk_count = chunk_count
            if error_message:
                doc.error_message = error_message
            if status in ["indexed", "failed"]:
                doc.processed_at = datetime.utcnow().isoformat() + "Z"
            db.commit()
            db.refresh(doc)
            return doc.to_dict()
        finally:
            db.close()

    def delete_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        db = SessionLocal()
        try:
            doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
            if not doc:
                return None
            doc_dict = doc.to_dict()
            db.delete(doc)
            db.commit()
            return doc_dict
        finally:
            db.close()

db_service = DBService()
