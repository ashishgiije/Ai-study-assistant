import re
from typing import List, Dict, Any, Optional

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Normalize line breaks and whitespace
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def extract_pdf_pages(file_path: str) -> List[Dict[str, Any]]:
    pages = []
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        for page_num, page in enumerate(doc, start=1):
            text = clean_text(page.get_text())
            if text:
                pages.append({
                    "page_number": page_num,
                    "text": text
                })
        doc.close()
    except Exception as e:
        print(f"Error reading PDF with PyMuPDF: {e}")
        # Fallback reading as plain text if fitz fails
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw = f.read()
            cleaned = clean_text(raw)
            if cleaned:
                pages.append({"page_number": 1, "text": cleaned})
    return pages

def extract_docx_sections(file_path: str) -> List[Dict[str, Any]]:
    pages = []
    try:
        import docx
        doc = docx.Document(file_path)
        current_section = "General"
        current_text_lines = []

        for p in doc.paragraphs:
            trimmed = p.text.strip()
            if not trimmed:
                continue

            # Identify title/heading candidate
            if len(trimmed) < 80 and not trimmed.endswith(".") and not trimmed.endswith(":"):
                if current_text_lines:
                    full_text = clean_text("\n\n".join(current_text_lines))
                    if full_text:
                        pages.append({
                            "section": current_section,
                            "text": full_text
                        })
                    current_text_lines = []
                current_section = trimmed
            else:
                current_text_lines.append(trimmed)

        if current_text_lines:
            full_text = clean_text("\n\n".join(current_text_lines))
            if full_text:
                pages.append({
                    "section": current_section,
                    "text": full_text
                })
    except Exception as e:
        print(f"Error reading DOCX: {e}")
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw = f.read()
            cleaned = clean_text(raw)
            if cleaned:
                pages.append({"section": "General", "text": cleaned})

    return pages

def extract_txt_content(file_path: str) -> List[Dict[str, Any]]:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        raw_text = f.read()
    cleaned = clean_text(raw_text)
    return [{"section": "Notes", "text": cleaned}] if cleaned else []

def extract_document_text(
    doc_id: str,
    chat_id: str,
    file_path: str,
    file_name: str,
    file_type: str
) -> Dict[str, Any]:
    file_type_clean = file_type.lower().replace(".", "")
    pages: List[Dict[str, Any]] = []

    if file_type_clean == "pdf":
        pages = extract_pdf_pages(file_path)
    elif file_type_clean == "docx":
        pages = extract_docx_sections(file_path)
    elif file_type_clean == "txt":
        pages = extract_txt_content(file_path)
    else:
        # Fallback
        pages = extract_txt_content(file_path)

    return {
        "doc_id": doc_id,
        "chat_id": chat_id,
        "file_name": file_name,
        "file_type": file_type_clean,
        "pages": pages
    }
