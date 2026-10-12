# Current Architecture Audit

## Snapshot before refactoring

This audit records the repository state before the modular improvement pass.

### Existing components

- **FastAPI:** `app/main.py` exposed request, workflow, approval, audit and health endpoints.
- **Workflow engine:** `app/orchestrator.py` performed classification, extraction, retrieval, rules and simulated action execution in one function.
- **SQLite:** `app/db.py` stored workflows and audit events in two tables. Audit events had no normal update/delete endpoint.
- **Classifier:** `app/classifier.py` used TF-IDF + Logistic Regression, but trained on a very small embedded demonstration corpus rather than Banking77.
- **Extraction:** `app/llm.py` was regex-based only; it did not call an LLM and did not strictly validate structured output.
- **RAG:** `app/rag.py` held four policies directly in Python and used token overlap; documents were not loaded from a directory and no chunking/vectorizer pipeline existed.
- **Business rules:** `app/rules.py` applied confidence, source, cancellation and refund-limit rules.
- **Actions:** `app/actions.py` returned a safe simulated action result and contacted no external system.
- **Human review:** approval and rejection endpoints existed and were surfaced in the static dashboard.
- **Dashboard:** `app/static/index.html` showed counts, recent workflows and a review queue.
- **Tests:** six API/workflow tests passed offline. They did not cover LLM failure modes, document loading, or rule edge cases.
- **Evaluation:** `experiments/train_banking77.py` ran separately against the official public CSV source and wrote measured metrics.

## Findings

### Strengths preserved

- Clear end-to-end workflow boundary.
- FastAPI and OpenAPI documentation.
- SQLite keeps local setup simple.
- Human review is required for cancellation, over-limit refunds and unsupported intents.
- Simulated adapters avoid financial side effects.
- Audit events are append-only through the application API.

### Gaps addressed in the refactor

1. Add modular API, AI, workflow and database packages.
2. Load demo policies from `data/documents/`, chunk them and retrieve with TF-IDF vectors and source references.
3. Add a provider interface for mock and OpenAI-compatible structured extraction.
4. Validate all extracted fields with Pydantic and route provider failures to human review.
5. Make the real Banking77 experiment produce reproducible artifacts without downloading during tests.
6. Expand test coverage for extraction failures, RAG no-result behavior, deterministic rules and audit metadata.
7. Separate app configuration from implementation details and improve security documentation.
