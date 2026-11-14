import io
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


class UploadTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        root = Path(cls.directory.name)
        cls.env = patch.dict(os.environ, {
            "DATABASE_URL": f"sqlite:///{(root / 'test.sqlite').as_posix()}",
            "UPLOAD_DIRECTORY": str(root / "uploads"),
            "VECTOR_STORE_PATH": str(root / "vectors.json"),
            "USE_FALLBACK_EMBEDDINGS": "true",
            "GEMINI_API_KEY": "",
            "QDRANT_URL": "",
            "MAX_FILE_SIZE_MB": "1",
        })
        cls.env.start()
        from src.backend_python.main import app
        from src.backend_python.db import engine
        cls.addClassCleanup(cls.directory.cleanup)
        cls.addClassCleanup(cls.env.stop)
        cls.addClassCleanup(engine.dispose)
        cls.client = TestClient(app)
        cls.addClassCleanup(cls.client.close)

    def setUp(self):
        response = self.client.post("/api/chats", json={"title": "Disposable notes"})
        self.assertEqual(response.status_code, 201)
        self.chat = f"/api/chats/{response.json()['id']}"
        self.addCleanup(self.client.delete, self.chat)

    def upload(self, name, data):
        return self.client.post(self.chat + "/documents", files={"files": (name, data)})

    def test_text_answer_with_citation_and_cleanup(self):
        response = self.upload("notes.txt", b"Photosynthesis turns light into chemical energy. Chlorophyll absorbs light.")
        self.assertEqual(response.status_code, 201, response.text)
        document = response.json()["documents"][0]
        self.assertEqual(document["status"], "indexed")
        result = self.client.post(self.chat + "/messages", json={
            "question": "What does photosynthesis do?", "document_id": document["id"],
        }).json()
        self.assertIn("chemical energy", result["answer"])
        self.assertEqual(result["sources"][0]["document_id"], document["id"])
        self.assertEqual(len(self.client.get(self.chat + "/messages").json()), 2)
        self.assertEqual(self.client.delete(self.chat + "/documents/" + document["id"]).status_code, 200)
        self.assertEqual(self.client.get(self.chat + "/documents").json(), [])

    def test_unrelated_question_has_no_sources(self):
        self.upload("notes.txt", b"Photosynthesis turns light into chemical energy.")
        response = self.client.post(self.chat + "/messages", json={"question": "Who invented basketball?"})
        self.assertEqual(response.json()["sources"], [])

    def test_narrow_question_returns_only_the_matching_sentence(self):
        self.upload("mixed.txt", b"Chlorophyll absorbs light. Photosynthesis turns light into chemical energy. "
                                 b"Cellular respiration occurs in mitochondria. The nucleus contains DNA.")
        response = self.client.post(self.chat + "/messages", json={"question": "What does photosynthesis do?"})
        self.assertEqual(response.status_code, 200)
        result = response.json()
        expected = "Photosynthesis turns light into chemical energy."
        self.assertEqual(result["answer"], expected)
        self.assertEqual([source["snippet"] for source in result["sources"]], [expected])
        self.assertEqual(result["suggested_questions"], [])

    def test_provider_timeout_returns_cited_excerpts(self):
        self.upload("notes.txt", b"Photosynthesis turns light into chemical energy.")
        from src.backend_python import gemini_service
        with patch.object(gemini_service, "get_genai_client", return_value=object()) as client:
            with patch.object(gemini_service, "call_gemini_with_retry", side_effect=TimeoutError):
                response = self.client.post(self.chat + "/messages", json={"question": "What does photosynthesis do?"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("chemical energy", response.json()["answer"])
        self.assertEqual(len(response.json()["sources"]), 1)
        client.assert_called_once()

    def test_resume_phone_and_all_projects_have_different_answer_scopes(self):
        response = self.upload("resume.txt", (
            b"Sample Candidate\nPhone: +1 (202) 555-0142\n\nProjects\n"
            b"Study Assistant\nBuilt a retrieval pipeline for lecture notes.\n"
            b"Used Python and FastAPI to serve answers.\n\n"
            b"Weather Tracker\nBuilt a dashboard that charts rainfall trends.\n"
            b"Used React for the interface.\n\nEducation\nExample University"
        ))
        doc = response.json()["documents"][0]
        for question, expected in (
            ("Give me phone number", "+1 (202) 555-0142"),
            ("Give me all projects details", "Study Assistant\n\nBuilt a retrieval pipeline for lecture notes.\n\n"
             "Used Python and FastAPI to serve answers.\n\nWeather Tracker\n\n"
             "Built a dashboard that charts rainfall trends.\n\nUsed React for the interface."),
        ):
            result = self.client.post(self.chat + "/messages", json={"question": question, "document_id": doc["id"]}).json()
            self.assertEqual(result["answer"], expected)
            self.assertEqual(result["sources"][0]["document_id"], doc["id"])

    def test_first_two_assignment_questions_follow_pdf_order(self):
        import pymupdf
        with pymupdf.open() as pdf:
            pdf.new_page().insert_text((72, 72), "Practice Assignment\n1.\nDefine photosynthesis.\n"
                                       "2. Explain how plants use light.\nInclude one example.")
            pdf.new_page().insert_text((72, 72), "3. Describe mitosis.")
            result = self.upload("assignment.pdf", pdf.tobytes())
        doc = result.json()["documents"][0]
        result = self.client.post(self.chat + "/messages", json={
            "question": "Give me first to question from the assignment PDF", "document_id": doc["id"],
        }).json()
        self.assertEqual(result["answer"], "1. Define photosynthesis.\n2. Explain how plants use light. Include one example.")
        self.assertEqual(result["sources"][0]["page_number"], 1)

    def test_empty_and_corrupt_documents_report_failure(self):
        for name in ("blank.txt", "broken.pdf", "broken.docx"):
            with self.subTest(name=name):
                data = b"   " if name.endswith(".txt") else b"invalid format"
                response = self.upload(name, data)
                self.assertEqual(response.status_code, 201, response.text)
                doc = response.json()["documents"][0]
                self.assertEqual(doc["status"], "failed")
                self.assertTrue(doc["error_message"])

    def test_pdf_preserves_page_number(self):
        import pymupdf
        with pymupdf.open() as pdf:
            page = pdf.new_page()
            page.insert_text((72, 72), "Mitosis creates two genetically identical daughter cells.")
            response = self.upload("cells.pdf", pdf.tobytes())
        self.assertEqual(response.json()["documents"][0]["status"], "indexed")
        answer = self.client.post(self.chat + "/messages", json={"question": "What does mitosis create?"}).json()
        self.assertEqual(answer["sources"][0]["page_number"], 1)

    def test_docx_preserves_section_and_short_paragraph(self):
        from docx import Document
        buffer = io.BytesIO()
        doc = Document()
        doc.add_heading("Cell Energy", level=1)
        doc.add_paragraph("Mitochondria produce ATP")
        doc.save(buffer)
        self.assertEqual(self.upload("cells.docx", buffer.getvalue()).json()["documents"][0]["status"], "indexed")
        answer = self.client.post(self.chat + "/messages", json={"question": "What do mitochondria produce?"}).json()
        self.assertEqual(answer["sources"][0]["section"], "Cell Energy")
        self.assertIn("ATP", answer["answer"])

    def test_limits_and_chunk_size(self):
        self.assertEqual(self.upload("bad.csv", b"example").status_code, 415)
        self.assertEqual(self.upload("large.txt", b"x" * (1024 * 1024 + 1)).status_code, 413)
        result = self.upload("long.txt", b"long study paragraph " * 120)
        self.assertGreater(result.json()["documents"][0]["chunk_count"], 1)
