from typing import Dict, Any, List, Optional
from src.backend_python.db import db_service
from src.backend_python.vector_store import vector_store
from src.backend_python.reranker import rerank_chunks
from src.backend_python.gemini_service import NO_DOCUMENT_ANSWER, comparison_topics, find_definition, generate_rag_answer, get_genai_client, call_gemini_with_retry
from src.backend_python.config import config
from src.backend_python.document_answers import extract_requested_content

def generate_general_study_answer(question: str) -> str:
    client = get_genai_client()
    if not client:
        return "Please ensure GEMINI_API_KEY is configured in your environment to get AI responses!"

    prompt = question
    system_instruction = ("You are EduMind AI, a study assistant. Answer the question directly and cover only the requested "
                          "facts. For a narrow question, use one sentence or a short phrase. Include explanations, "
                          "examples, or steps when requested.")

    try:
        from src.backend_python.gemini_service import get_valid_model_name
        def _call(model_name: str):
            from google.genai import types
            return client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.3
                )
            )

        target_model = get_valid_model_name(config.GEMINI_MODEL)
        try:
            response = call_gemini_with_retry(lambda: _call(target_model))
        except Exception as model_err:
            err_msg = str(model_err).lower()
            if "404" in err_msg or "not_found" in err_msg or "not found" in err_msg:
                response = call_gemini_with_retry(lambda: _call("gemini-2.5-flash"))
            else:
                raise model_err

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
    selected_docs = [doc for doc in chat_docs if doc["status"] == "indexed" and doc["chunk_count"] > 0
                     and (not document_id or doc["id"] == document_id)]
    indexed_docs = {doc["id"] for doc in selected_docs}
    extracted = extract_requested_content(question, selected_docs)

    if not chat_docs:
        # General conversation study mode
        answer_text = generate_general_study_answer(question)
        citations = []
        suggested_questions = []
    elif extracted is not None:
        answer_text, citations = extracted
        suggested_questions = []
    else:
        # RAG mode over uploaded document chunks
        retrieved_chunks = vector_store.search(
            current_chat_id=chat_id,
            query=question,
            document_id=document_id,
            top_k=config.RETRIEVAL_TOP_K  # Top 10
        ) if indexed_docs and (not document_id or document_id in indexed_docs) else []
        retrieved_chunks = [chunk for chunk in retrieved_chunks if chunk["document_id"] in indexed_docs]

        topics = comparison_topics(question)
        topic_chunks = []
        if indexed_docs:
            for topic in topics:
                candidates = vector_store.search(chat_id, f"Define {topic}", document_id, config.RETRIEVAL_TOP_K)
                candidates = [chunk for chunk in candidates if chunk["document_id"] in indexed_docs]
                ranked = rerank_chunks(f"Define {topic}", candidates, top_n=2)["chunks"]
                topic_chunks.extend(ranked)

        rerank_result = rerank_chunks(
            query=question,
            chunks=retrieved_chunks,
            top_n=config.RERANK_TOP_N,  # Top 5
            min_relevance_score=0.10
        )

        final_chunks = list({chunk["chunk_id"]: chunk for chunk in topic_chunks + rerank_result["chunks"]}.values())
        if not final_chunks:
            final_chunks = [chunk for chunk in retrieved_chunks if chunk.get("dense_score", 0.0) >= 0.60][:config.RERANK_TOP_N]
        definition = find_definition(question, retrieved_chunks) if not topics else None
        if definition:
            evidence_chunks = [
                {**chunk, "citation_text": definition} for chunk in retrieved_chunks
                if definition in " ".join(chunk["text"].split())
            ][:1]
            answer_text = definition
        else:
            answer_text, evidence_chunks = generate_rag_answer(question, final_chunks)

        citations = []
        seen = set()
        for chunk in evidence_chunks:
            key = (chunk["document_id"], chunk.get("page_number"), chunk.get("section"))
            if key in seen:
                continue
            seen.add(key)
            source_text = chunk.get("citation_text") or chunk["text"]
            excerpt = source_text[:180] + ("..." if len(source_text) > 180 else "")
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
        suggested_questions = []

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

