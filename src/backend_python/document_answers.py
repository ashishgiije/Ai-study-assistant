import re
from typing import Optional

from src.backend_python.document_processor import extract_document_text
from src.backend_python.gemini_service import DEFINITION_QUESTION, find_definition

PHONE_REQUEST = re.compile(r"\b(?:phone|mobile|telephone|cell(?:phone)?)\s+(?:number|no\.?)(?!\w)", re.I)
PHONE = re.compile(r"(?<![\d.])(?:\+\d{1,3}[ .-]?)?(?:\(\d{2,4}\)|\d{2,5})[ .-]?\d{3,5}[ .-]?\d{4}(?!\d)")
PROJECT_REQUEST = re.compile(r"\b(?:all|list|every)\b.*\bprojects?\b|\bprojects?\b.*\bdetails?\b|\bdetails?\b.*\bprojects?\b", re.I)
ORDINAL = re.compile(r"\bfirst\s+(?:(\d+|one|two|three|four|five|to|too)\s+)?questions?\b", re.I)
QUESTION_START = re.compile(r"^\s*(?:(?:Q(?:uestion)?[.\s]*)(\d+)\s*[.):\-]?|(\d+)(?:\s*[.):\-]|$))\s*(.*)$", re.I)
PROJECT_HEADING = re.compile(r"^(?:(?:academic|personal|selected|technical|key|recent|software|major)\s+)*projects?(?:\s+(?:details?|experience|portfolio))?\s*:?$", re.I)
NEXT_SECTION = re.compile(r"^(?:education|skills|technical skills|experience|work experience|professional experience|employment|certifications?|awards?|achievements?|languages|interests|references|publications?|contact(?: information)?|volunteer(?:ing| experience)?|summary|profile)\s*:?$", re.I)
NUMBER_WORDS = {"one": 1, "two": 2, "to": 2, "too": 2, "three": 3, "four": 4, "five": 5}


def find_definition_in_documents(question: str, documents: list[dict]) -> Optional[tuple[str, list[dict]]]:
    if not DEFINITION_QUESTION.fullmatch(question.strip()):
        return None
    passages = []
    for document in documents:
        try:
            pages = extract_document_text(
                document["id"], document["chat_id"], document["file_path"],
                document["file_name"], document["file_type"],
            )["pages"]
        except (OSError, ValueError):
            continue
        passages.extend({
            "text": page["text"], "document_id": document["id"], "document_name": document["file_name"],
            "file_type": document["file_type"], "page_number": page.get("page_number"), "section": page.get("section"),
        } for page in pages)
    answer = find_definition(question, passages)
    if answer:
        sources = [{**passage, "citation_text": answer} for passage in passages
                   if answer in " ".join(passage["text"].split())]
        return answer, sources[:1]
    return None


def extract_requested_content(question: str, documents: list[dict]) -> Optional[tuple[str, list[dict]]]:
    ordinal = ORDINAL.search(question)
    phone = PHONE_REQUEST.search(question)
    projects = PROJECT_REQUEST.search(question)
    if not (ordinal or phone or projects):
        return None

    answers = []
    sources = []
    for document in documents:
        try:
            pages = extract_document_text(
                document["id"], document["chat_id"], document["file_path"],
                document["file_name"], document["file_type"],
            )["pages"]
        except (OSError, ValueError):
            continue

        lines = []
        for page in pages:
            if page.get("section") and page["section"] not in {"Notes", "General"}:
                lines.append((page["section"], page.get("page_number")))
            lines.extend((line.strip(), page.get("page_number")) for line in page["text"].splitlines() if line.strip())

        extracted = []
        if ordinal:
            count_text = (ordinal.group(1) or "one").lower()
            count = max(1, min(int(count_text), 50)) if count_text.isdecimal() else NUMBER_WORDS[count_text]
            extracted = first_questions(lines, count)
        elif projects:
            in_projects = False
            for line, page in lines:
                if PROJECT_HEADING.fullmatch(line):
                    in_projects = True
                elif in_projects and NEXT_SECTION.fullmatch(line):
                    in_projects = False
                elif in_projects:
                    extracted.append((line, page))
        elif phone:
            # Prefer a labeled field over other number-like strings elsewhere.
            labeled = [(line, page) for line, page in lines if re.search(r"\b(?:phone|mobile|telephone|tel|cell)\b", line, re.I)]
            for line, page in labeled + lines:
                match = PHONE.search(line)
                if match:
                    extracted.append((match.group(), page))
                    break

        if extracted:
            separator = "\n" if ordinal else "\n\n"
            answers.append(separator.join(line for line, _ in extracted))
            for page in dict.fromkeys(page for _, page in extracted):
                snippet = next(line for line, line_page in extracted if line_page == page)[:180]
                sources.append({
                    "document_id": document["id"], "document_name": document["file_name"],
                    "file_type": document["file_type"], "page_number": page,
                    "section": "Projects" if projects else None, "snippet": snippet, "excerpt": snippet,
                })
            if phone or ordinal:
                break

    if answers:
        return "\n\n".join(answers), sources
    return None


def first_questions(lines: list[tuple[str, Optional[int]]], count: int) -> list[tuple[str, Optional[int]]]:
    questions = []
    current = []
    current_page = None
    for line, page in lines:
        match = QUESTION_START.match(line)
        if match:
            number = int(match.group(1) or match.group(2))
            if number != len(questions) + (2 if current else 1):
                continue
            if current:
                questions.append((" ".join(current), current_page))
                if len(questions) == count:
                    return questions
            current = [f"{number}.", match.group(3)] if match.group(3) else [f"{number}."]
            current_page = page
        elif current:
            current.append(line)
    if len(current) > 1:
        questions.append((" ".join(current), current_page))
    return questions
