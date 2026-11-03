# Source Audit — Ai-study-assistant

Reviewed 4 November 2026 against source commit `0c4dba0c254357f15d51fe981231f4b4bf58f816`. This is a focused code/documentation review and selected local validation, not a penetration test or an exhaustive vulnerability scan. Application files and credentials were not changed. Secret values are intentionally omitted.

## Severity summary

| Critical | High | Medium | Low |
|---:|---:|---:|---:|
| 1 | 1 | 3 | 2 |

Critical: direct resource/identity boundary failure. High: serious exposure or a core reproducibility blocker. Medium: correctness, validation, or deployment issue. Low: maintenance or coverage gap. Static findings describe potential impact; only explicitly listed runtime checks were executed.

## Findings

### 1. Critical — extract_user_id trusts x-user-id or bearer text without token verification; message/document endpoints omit consistent owner checks

- **Affected file:** [src/backend_python/main.py](<src/backend_python/main.py>)
- **Evidence:** extract_user_id trusts x-user-id or bearer text without token verification; message/document endpoints omit consistent owner checks.
- **Potential impact:** Callers can impersonate another identity or access another chat’s messages and documents.
- **Recommended correction:** Verify Firebase ID tokens server-side and enforce owner checks for every resource operation.

### 2. High — Upload paths use client-supplied chat IDs/filenames without a resolved-path containment check, and files are fully read without enforcing MAX_FILE_SIZE_MB

- **Affected file:** [src/backend_python/main.py](<src/backend_python/main.py>)
- **Evidence:** Upload paths use client-supplied chat IDs/filenames without a resolved-path containment check, and files are fully read without enforcing MAX_FILE_SIZE_MB.
- **Potential impact:** Malicious multipart paths or oversized input can escape intended storage boundaries or exhaust memory/disk.
- **Recommended correction:** Use generated safe filenames, validate IDs, enforce containment, and stream bounded uploads.

### 3. Medium — Whole paragraphs can exceed the configured chunk target

- **Affected file:** [src/backend_python/chunker.py](<src/backend_python/chunker.py>)
- **Evidence:** Whole paragraphs can exceed the configured chunk target.
- **Potential impact:** Long unbroken text can create oversized embedding/generation inputs.
- **Recommended correction:** Split oversized paragraphs with a bounded recursive/token-aware strategy.

### 4. Medium — Model failures silently select deterministic fallback embeddings

- **Affected file:** [src/backend_python/embeddings.py](<src/backend_python/embeddings.py>)
- **Evidence:** Model failures silently select deterministic fallback embeddings.
- **Potential impact:** The application may remain available while retrieval quality changes substantially.
- **Recommended correction:** Expose the active embedding mode and evaluate retrieval under each mode.

### 5. Low — Python dependencies use broad minimum versions and no environment lock

- **Affected file:** [requirements.txt](<requirements.txt>)
- **Evidence:** Python dependencies use broad minimum versions and no environment lock.
- **Potential impact:** Fresh installs can change API compatibility.
- **Recommended correction:** Pin and validate a reproducible Python environment.

### 6. Low — No automated application test script is defined

- **Affected file:** [package.json](<package.json>)
- **Evidence:** No automated application test script is defined.
- **Potential impact:** RAG isolation, upload boundaries, and persistence lack regression coverage.
- **Recommended correction:** Add API ownership tests and deterministic retrieval fixtures.

### 7. Medium — TypeScript checking fails at app

- **Affected file:** [server.ts](<server.ts>)
- **Evidence:** TypeScript checking fails at app.listen because PORT can be string | 3000.
- **Potential impact:** The build bundles successfully but the required type check fails.
- **Recommended correction:** Parse and validate the environment port as a number in a separate code change.

## Validation evidence

`bun install --frozen-lockfile` and `npm run build` passed. `npm run lint` failed: server.ts passes a string | number port to a numeric app.listen overload. Health, chat create/read, TXT extraction/indexing, document list, and chat cleanup passed in fallback mode; Gemini and learned models unrun

## Review scope and limits

Reviewed tracked application source, entry points, manifests/configuration, routes and data models where present, existing documentation, and available test definitions. Generated dependencies and binary artifacts were inventoried rather than treated as authored application logic. Provider calls, cloud deployment, and external data/model claims remain unverified unless explicitly listed above. No secret was rotated and no migration was run against a user database.

## Priorities

Address Critical and High findings before public deployment. Then add regression tests for the affected boundary or workflow, fix Medium issues, and resolve Low maintenance findings. All application corrections require a separate reviewed coding change.
