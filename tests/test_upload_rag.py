import io
import os
import tempfile
import unittest
from types import SimpleNamespace
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

    def test_lightweight_reranker_can_keep_model_embeddings_enabled(self):
        from src.backend_python import reranker

        passages = [
            {"chunk_id": "a", "text": "Maple trees grow in the garden.", "score": 0.55},
            {"chunk_id": "b", "text": "A telescope observes distant stars.", "score": 0.50},
        ]
        with (
            patch.object(reranker.config, "USE_FALLBACK_EMBEDDINGS", False),
            patch.object(reranker.config, "USE_FALLBACK_RERANKER", True),
            patch.object(reranker, "get_cross_encoder") as get_model,
        ):
            result = reranker.rerank_chunks("telescope", passages, top_n=1)

        get_model.assert_not_called()
        self.assertEqual(result["chunks"][0]["chunk_id"], "b")

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

    def test_qdrant_indexes_searches_and_deletes_scoped_vectors(self):
        import warnings
        from qdrant_client import QdrantClient
        from src.backend_python import vector_store as store_module

        qdrant = QdrantClient(":memory:")
        self.addCleanup(qdrant.close)
        store = store_module.VectorStoreService()
        vector = [1.0] + [0.0] * 383
        with warnings.catch_warnings(), patch.object(store_module.config, "QDRANT_URL", "http://qdrant.test"):
            warnings.filterwarnings("ignore", message="Payload indexes have no effect.*")
            with patch("qdrant_client.QdrantClient", return_value=qdrant):
                store._init_qdrant_lazy()
            self.assertTrue(store.qdrant_enabled)
            chunks = [{
                "chunk_id": f"chunk-{chat}", "chat_id": chat, "document_id": "notes",
                "document_name": "notes.txt", "file_type": "txt", "chunk_index": 0,
                "text": "Study notes.", "enriched_text": "Study notes.",
            } for chat in ("first-chat", "other-chat")]
            def embeddings(texts, query=False):
                return "BAAI/bge-small-en-v1.5", [vector for _ in texts]

            with patch.object(store_module, "VECTOR_DB_FILE", str(Path(self.directory.name) / "qdrant-test.json")):
                with patch.object(store_module, "generate_embeddings", side_effect=embeddings):
                    store.add_chunks(chunks)
                    store.memory_store.clear()
                    self.assertEqual([r["chunk_id"] for r in store.search("first-chat", "notes", "notes")], ["chunk-first-chat"])
                    self.assertEqual(store.search("first-chat", "notes", "wrong-document"), [])
                    store.delete_document_vectors("first-chat", "notes")
                    self.assertEqual(store.search("first-chat", "notes"), [])
                    self.assertEqual(len(store.search("other-chat", "notes")), 1)

    def test_semantic_fallback_answers_without_shared_words(self):
        from src.backend_python.gemini_service import generate_rag_answer, NO_DOCUMENT_ANSWER
        chunk = {"text": "The Moon orbits Earth. Freshwater freezes at zero degrees Celsius.",
                 "semantic_score": 0.91, "document_name": "science.txt"}
        with patch("src.backend_python.gemini_service.get_genai_client", return_value=None):
            with patch("src.backend_python.reranker.config.USE_FALLBACK_EMBEDDINGS", False):
                with patch("src.backend_python.reranker.get_cross_encoder") as model:
                    model.return_value.rerank.return_value = [-5, 4]
                    answer, sources = generate_rag_answer("When does water become solid?", [chunk])
                    self.assertEqual(answer, "Freshwater freezes at zero degrees Celsius.")
                    self.assertEqual(sources[0]["citation_text"], answer)
                    model.return_value.rerank.return_value = [-5, -5]
                    self.assertEqual(generate_rag_answer("Who invented basketball?", [chunk]), (NO_DOCUMENT_ANSWER, []))

    def test_comparison_uses_sources_from_both_documents(self):
        tree = self.upload("tree.txt", b"A decision tree uses a single tree to split data.").json()["documents"][0]
        forest = self.upload("forest.txt", b"A random forest uses an ensemble of decision trees.").json()["documents"][0]
        result = self.client.post(self.chat + "/messages", json={
            "question": "What is the difference between a random forest and a decision tree?",
        }).json()
        self.assertIn("single tree", result["answer"])
        self.assertIn("ensemble", result["answer"])
        self.assertEqual({source["document_id"] for source in result["sources"]}, {tree["id"], forest["id"]})

    def test_generated_answer_only_cites_selected_context(self):
        from src.backend_python.gemini_service import generate_rag_answer
        chunks = [
            {"text": "An unrelated reference.", "document_name": "intro.txt"},
            {"text": "Plants convert light into chemical energy.", "document_name": "biology.txt"},
        ]
        client = SimpleNamespace(models=SimpleNamespace(generate_content=lambda **kwargs: SimpleNamespace(
            text='{"answer":"Plants convert light into chemical energy.","sources":[2,2]}',
        )))
        with patch("src.backend_python.gemini_service.get_genai_client", return_value=client):
            answer, sources = generate_rag_answer("What do plants do with light?", chunks)
        self.assertEqual(answer, "Plants convert light into chemical energy.")
        self.assertEqual(sources, [chunks[1]])

    def test_definitions_outrank_passing_mentions(self):
        self.upload("references.txt", b"The output is written back to HDFS for reporting. "
                    b"Reports are copied to Sqoop. Backups go to the NameNode.")
        doc = self.upload("definitions.txt", b"Storage concepts\n"
                          b"Hadoop Distributed File System (HDFS) stores large files across a cluster. "
                          b"The NameNode manages the file namespace and keeps track of block locations. "
                          b"Sqoop performs bulk transfers between relational databases and Hadoop.").json()["documents"][0]
        cases = {
            "What is HDFS?": "Hadoop Distributed File System (HDFS) stores large files across a cluster.",
            "What does HDFS stand for?": "Hadoop Distributed File System",
            "Define Sqoop": "Sqoop performs bulk transfers between relational databases and Hadoop.",
            "What is the NameNode?": "The NameNode manages the file namespace and keeps track of block locations.",
        }
        for question, expected in cases.items():
            with self.subTest(question=question):
                result = self.client.post(self.chat + "/messages", json={"question": question}).json()
                self.assertEqual(result["answer"], expected)
                self.assertEqual(result["sources"][0]["document_id"], doc["id"])

    def test_definition_recovers_from_a_missing_vector_index(self):
        doc = self.upload("hadoop.txt", b"Hadoop Distributed File System (HDFS) stores files across multiple machines.").json()["documents"][0]
        with patch("src.backend_python.vector_store.vector_store.search", return_value=[]):
            result = self.client.post(self.chat + "/messages", json={
                "question": "what is HDFS?", "document_id": doc["id"],
            }).json()
        self.assertIn("Hadoop Distributed File System", result["answer"])
        self.assertEqual(result["sources"][0]["document_id"], doc["id"])

    def test_concept_definition_includes_supported_details(self):
        doc = self.upload("pig.txt", (
            b"Pig is a platform for expressing data transformations in Pig Latin. "
            b"Pig parses scripts into a logical plan and can run them as MapReduce jobs. "
            b"Pig supports operations like LOAD, FILTER, and GROUP. "
            b"HiveQL uses a declarative style."
        )).json()["documents"][0]
        def ask():
            return self.client.post(self.chat + "/messages", json={
                "question": "What is Pig?", "document_id": doc["id"],
            }).raise_for_status().json()

        result = ask()
        self.assertIn("Pig Latin", result["answer"])
        self.assertIn("MapReduce", result["answer"])
        self.assertIn("FILTER", result["answer"])
        self.assertNotIn("HiveQL", result["answer"])
        self.assertEqual(result["sources"][0]["document_id"], doc["id"])

        generated = SimpleNamespace(text='{"answer":"Pig runs data transformations in Pig Latin and can execute them as MapReduce jobs.","sources":[1]}')
        service = "src.backend_python.gemini_service"
        with patch(f"{service}.get_genai_client", return_value=object()):
            with patch(f"{service}.call_gemini_with_retry", return_value=generated) as call:
                self.assertIn("can execute them", ask()["answer"])
                call.assert_called_once()

    def test_stale_document_selection_reports_upload_problem(self):
        self.upload("other.txt", b"Nothing about Hadoop here.")
        result = self.client.post(self.chat + "/messages", json={
            "question": "what is HDFS?", "document_id": "missing-doc",
        }).json()
        self.assertIn("selected document is unavailable", result["answer"])
        self.assertEqual(result["sources"], [])

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

    def test_gemini_limit_is_displayed_without_fallback(self):
        from src.backend_python.gemini_service import GEMINI_RATE_LIMIT_MESSAGE

        class RateLimitError(Exception):
            code = 429

        backend = "src.backend_python"
        for module in ("rag_pipeline", "gemini_service"):
            with self.subTest(module=module):
                if module == "gemini_service":
                    self.upload("notes.txt", b"Photosynthesis turns light into chemical energy.")
                with patch(f"{backend}.{module}.get_genai_client", return_value=object()):
                    with patch(f"{backend}.{module}.call_gemini_with_retry", side_effect=RateLimitError):
                        response = self.client.post(self.chat + "/messages", json={"question": "What does photosynthesis do?"})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["answer"], GEMINI_RATE_LIMIT_MESSAGE)
                self.assertEqual(response.json()["sources"], [])
        self.assertEqual(self.client.get(self.chat + "/messages").json()[-1]["content"], GEMINI_RATE_LIMIT_MESSAGE)

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
