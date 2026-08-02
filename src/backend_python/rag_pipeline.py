from typing import Dict, Any, List, Optional
from src.backend_python.db import db_service
from src.backend_python.vector_store import vector_store
from src.backend_python.reranker import rerank_chunks
from src.backend_python.gemini_service import generate_rag_answer, generate_suggested_questions, get_genai_client, call_gemini_with_retry
from src.backend_python.config import config

def generate_general_study_answer(question: str) -> str:
    client = get_genai_client()
    if not client:
        return "Please ensure GEMINI_API_KEY is configured in your environment to get AI responses!"

    prompt = question
    system_instruction = "You are EduMind AI, a helpful, encouraging academic study assistant. Provide clear, structured, markdown-formatted study explanations."

    try:
        def _call():
            from google.genai import types
            return client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.3
                )
            )

        response = call_gemini_with_retry(_call)
        text = response.text if response and response.text else ""
        if text.strip():
            return text.strip()
        return "I am ready to help you study! Upload your study documents or ask any question to get started."
    except Exception as err:
        err_str = str(err)
        return f"EduMind AI servers are currently experiencing high demand: {err_str}"

def process_question(chat_id: str, question: str, document_id: Optional[str] = None) -> Dict[str, Any]:
    # 1. Save user question message to DB
    user_msg = db_service.add_message(
        chat_id=chat_id,
        role="user",
        content=question
    )

    # Check if documents exist in this chat
    chat_docs = db_service.get_documents(chat_id)

    if not chat_docs:
        # General conversation study mode
        answer_text = generate_general_study_answer(question)
        citations = []
        suggested_questions = generate_suggested_questions(question, answer_text)
    else:
        # RAG mode over uploaded document chunks
        retrieved_chunks = vector_store.search(
            current_chat_id=chat_id,
            query=question,
            document_id=document_id,
            top_k=config.RETRIEVAL_TOP_K  # Top 10
        )

        rerank_result = rerank_chunks(
            query=question,
            chunks=retrieved_chunks,
            top_n=config.RERANK_TOP_N,  # Top 5
            min_relevance_score=0.10
        )

        is_relevant = rerank_result["is_relevant"]
        final_chunks = rerank_result["chunks"]

        if not is_relevant or not final_chunks:
            answer_text = "I couldn’t find this information in the documents uploaded to this study chat."
            citations = []
            suggested_questions = [
                "Can you explain what documents are uploaded?",
                "What topics are covered in this study session?",
                "How can I upload additional study material?"
            ]
        else:
            answer_text = generate_rag_answer(question, final_chunks)

            citations = []
            seen_keys = set()
            for chunk in final_chunks:
                key = f"{chunk['document_id']}_{chunk.get('page_number')}_{chunk.get('section')}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    excerpt = chunk.get("text", "")[:180] + ("..." if len(chunk.get("text", "")) > 180 else "")
                    citations.append({
                        "document_id": chunk["document_id"],
                        "document_name": chunk["document_name"],
                        "file_type": chunk["file_type"],
                        "page_number": chunk.get("page_number"),
                        "section": chunk.get("section"),
                        "snippet": excerpt,
                        "excerpt": excerpt,
                        "relevance_score": round(chunk.get("score", 0.0), 3)
                    })

            suggested_questions = generate_suggested_questions(question, answer_text)

    # Save assistant response message to DB
    assistant_msg = db_service.add_message(
        chat_id=chat_id,
        role="assistant",
        content=answer_text,
        sources=citations,
        suggested_questions=suggested_questions
    )

    return {
        "answer": answer_text,
        "sources": citations,
        "suggested_questions": suggested_questions,
        "message": assistant_msg,
        "userMessage": user_msg,
        "assistantMessage": assistant_msg,
        "citations": citations,
        "suggestedQuestions": suggested_questions
    }

