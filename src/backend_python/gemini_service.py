import os
import json
import time
from typing import List, Dict, Any, Tuple
from src.backend_python.config import config

_genai_client = None

def get_genai_client():
    global _genai_client
    if _genai_client is None:
        api_key = config.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if api_key:
            try:
                from google import genai
                _genai_client = genai.Client(api_key=api_key)
            except Exception as e:
                print(f"Error initializing google-genai Client: {e}")
    return _genai_client

def call_gemini_with_retry(api_fn, max_retries: int = 2, initial_delay: float = 2.0):
    attempt = 0
    while True:
        try:
            return api_fn()
        except Exception as err:
            err_str = str(err)
            is_rate_limit = (
                "429" in err_str or
                "RESOURCE_EXHAUSTED" in err_str or
                "Quota exceeded" in err_str
            )
            if is_rate_limit and attempt < max_retries:
                attempt += 1
                delay = initial_delay * (2 ** (attempt - 1))
                print(f"[Gemini API Rate Limit 429] Retrying in {delay}s (attempt {attempt}/{max_retries})...")
                time.sleep(delay)
            else:
                raise err

SYSTEM_INSTRUCTION = """You are EduMind AI, an AI-powered study assistant.

Your main purpose is to help students understand the study materials uploaded to the current study chat.
Follow these rules strictly:
1. Answer the user's question using ONLY the provided document context chunks.
2. Do NOT use outside knowledge, assume facts, or hallucinate information not present in the context.
3. Be clear, academic, concise, and structured. Use markdown formatting (bolding, lists, bullet points) where appropriate.
4. If the context does NOT contain enough information to answer the question, respond EXACTLY with:
"I couldn’t find this information in the documents uploaded to this study chat."
Do NOT alter this exact phrase when information is missing."""

def generate_rag_answer(question: str, context_chunks: List[Dict[str, Any]]) -> str:
    if not context_chunks:
        return "I couldn’t find this information in the documents uploaded to this study chat."

    client = get_genai_client()
    if not client:
        # Fallback summary if API client is not configured
        context_str = "\n".join([f"- {c['text']}" for c in context_chunks[:3]])
        return f"Based on the uploaded documents:\n\n{context_str}"

    formatted_context = []
    for idx, chunk in enumerate(context_chunks, start=1):
        header = f"[Doc: {chunk['document_name']}"
        if chunk.get("page_number"):
            header += f" | Page: {chunk['page_number']}"
        if chunk.get("section"):
            header += f" | Section: {chunk['section']}"
        header += "]"

        formatted_context.append(f"Chunk {idx} {header}:\n{chunk['text']}")

    context_text = "\n\n---\n\n".join(formatted_context)

    prompt = f"""DOCUMENT CONTEXT:
{context_text}

USER QUESTION:
{question}

Provide a clear, accurate, and structured answer strictly based on the context above."""

    try:
        def _call():
            from google.genai import types
            return client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=config.LLM_TEMPERATURE
                )
            )

        response = call_gemini_with_retry(_call)
        text = response.text if response and response.text else ""
        if text.strip():
            return text.strip()
        return "I couldn’t find this information in the documents uploaded to this study chat."
    except Exception as err:
        err_str = str(err)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "Quota exceeded" in err_str:
            return "⚡ Gemini API quota limit reached (20 requests/min free tier limit). Please wait 20-30 seconds and try again, or check your API key quota in Settings > Secrets."
        if "API_KEY_INVALID" in err_str or "403" in err_str:
            return "🔑 Invalid or missing Gemini API key. Please check your GEMINI_API_KEY configuration in Settings > Secrets."
        return f"I encountered an issue generating the response: {err_str}. Please try asking again in a few moments."

def generate_suggested_questions(question: str, answer_text: str) -> List[str]:
    fallback_questions = [
        "Can you explain this concept in more detail?",
        "What are practical examples of this topic?",
        "Could you summarize this into 3 main bullet points?"
    ]

    if answer_text.startswith("⚡") or answer_text.startswith("🔑") or answer_text.startswith("I couldn"):
        return fallback_questions

    client = get_genai_client()
    if not client:
        return fallback_questions

    prompt = f"""Based on this question: "{question}" and answer: "{answer_text[:400]}", generate 3 short, relevant follow-up study questions a student might ask next. Return ONLY a JSON array of 3 strings."""

    try:
        def _call():
            from google.genai import types
            return client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3
                )
            )

        response = call_gemini_with_retry(_call, max_retries=1, initial_delay=1.0)
        if response and response.text:
            parsed = json.loads(response.text.strip())
            if isinstance(parsed, list) and len(parsed) >= 1:
                return [str(q) for q in parsed[:3]]
    except Exception:
        pass

    return fallback_questions
