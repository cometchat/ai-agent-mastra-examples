# Mastra PDF Knowledge Agent

Hybrid semantic + lexical (BM25) retrieval over uploaded PDFs with Mastra Agents and an orchestration workflow. This example demonstrates production‑minded patterns: document manifest, namespaced vector store, hybrid ranking (semantic + BM25), multi‑query expansion, streaming responses (SSE), rate limiting, and extensible retrieval tools (multi‑PDF + single‑PDF agents).

## Highlights

- Dual agents:
  - `pdfAgent` – multi‑document retrieval with context stitching and query expansion
  - `singlePdfAgent` – restricted to the most recently uploaded PDF
- Hybrid retrieval: cosine + BM25 with tunable `hybridAlpha`
- Multi‑query expansion (`multiQuery`, `qVariants`) for recall
- Deterministic workflow (`pdfWorkflow`) wrapping retrieval + answer generation
- Streaming endpoints (`/api/ask/stream`, `/api/ask/single/stream`)
- Manifest + persisted vector store in `.data/`
- Namespaced store (`namespace: 'pdf'`) supporting future collections
- Rate limiting & optional CORS
- Tool schemas with defensive fallback re‑queries

## Contents

- `src/mastra/index.ts` – Bootstraps Mastra (agents + workflow + in‑memory LibSQL telemetry store)
- `src/mastra/agents/pdf-agent.ts` – Multi‑PDF QA agent
- `src/mastra/agents/single-pdf-agent.ts` – Single‑PDF constrained agent
- `src/mastra/tools/retrieve-pdf-context.ts` – Hybrid retrieval tool (multi)
- `src/mastra/tools/retrieve-single-pdf-context.ts` – Hybrid retrieval tool (single doc)
- `src/mastra/workflows/pdf-workflow.ts` – Retrieval + answer orchestration
- `src/server.ts` – Express server (upload, ask, streaming, manifest ops)
- `src/lib/*` – Vector store, embeddings, manifest, retrieval helper, PDF parsing
- `docs/index.html` – Static UI (can be published via GitHub Pages)
- `mastra.mcp.json` – MCP server config (for IDE / external tool integration)

## Prerequisites

- Node.js >= 20.9.0
- OPENAI_API_KEY in environment (for embeddings + model)

## Install

```bash
npm install
```

## Development

Run Mastra dev environment (hot reload of agents/workflows):

```bash
npm run dev
```

Run PDF QA server (Express):
```bash
npm run serve
```
Server defaults to <http://localhost:3000>

## Architecture (Conceptual)

```text
	 ┌──────────────┐  upload (PDF)  ┌──────────────┐
User →  │  Express API │ ─────────────▶ │  PDF Parser  │
	 └──────┬───────┘                └──────┬───────┘
		 │  chunks + embeddings          │
		 ▼                                │
	 ┌──────────────┐  upsert/search  ┌──────────────┐
	 │ Vector Store │◀───────────────▶│ Embeddings   │
	 └──────┬───────┘                 └──────────────┘
		 │  retrieve (hybrid)
		 ▼
	 ┌──────────────┐    tool call    ┌──────────────┐
	 │  Mastra Agent│ ──────────────▶ │ retrieve-*   │
	 └──────┬───────┘                 └──────────────┘
		 │  context
		 ▼
	 ┌──────────────┐  answer tokens (SSE)
	 │   Workflow    │ ─────────────────────────▶ Client
	 └──────────────┘
```

## Agents & Tools

| Agent | File | Purpose | Tool(s) |
|-------|------|---------|---------|
| `pdfAgent` | `src/mastra/agents/pdf-agent.ts` | Multi‑PDF retrieval QA | `retrieve-pdf-context` |
| `singlePdfAgent` | `src/mastra/agents/single-pdf-agent.ts` | Latest PDF only | `retrieve-single-pdf-context` |

Tool input highlights:

```ts
// retrieve-pdf-context
{ query, docIds?, topK=5, hybridAlpha=0.7, multiQuery=true, qVariants=3, maxContextChars=4000 }

// retrieve-single-pdf-context
{ query, docId?, topK=5, hybridAlpha=0.7, multiQuery=true, qVariants=3, maxContextChars=4000 }
```

Fallback logic: if no results, it automatically broadens (higher `topK`, more `qVariants`).

## Endpoints

Base URL defaults to `http://localhost:3000` unless deployed.

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/upload` | multipart/form-data field `file` – ingests a PDF, returns `{ docId, pages, chunks }` |
| GET | `/api/documents` | Lists ingested documents (manifest) |
| DELETE | `/api/documents/:id` | Deletes a document (vectors + stored PDF + manifest entry) |
| POST | `/api/ask` | Workflow: multi‑PDF retrieval + answer (JSON result) |
| POST | `/api/ask/full` | Alias of `/api/ask` (demonstrates deterministic retrieval path) |
| POST | `/api/ask/stream` | SSE streaming multi‑PDF answer (`meta`, `token`, `done` events) |
| POST | `/api/ask/single` | Latest single PDF answer (JSON result) |
| POST | `/api/ask/single/stream` | SSE streaming single‑PDF answer |
| GET | `/api/documents/:id/file` | Stream raw stored PDF |

Parameters:

- `docIds` (optional array) – restrict retrieval to specific documents (multi only)
- `topK` – number of chunks to retrieve (default 5)
- `hybridAlpha` – semantic weight (0..1, default 0.7). Lower = more BM25 weight.
- `multiQuery` – enable query expansion (default true)
- `qVariants` – number of alternative queries (default 3)
- `maxContextChars` – soft cap for stitched context (default 4000)

### Curl Examples

Upload a PDF:

```bash
curl -X POST http://localhost:3000/api/upload \
	-H "Content-Type: multipart/form-data" \
	-F "file=@/path/to/file.pdf"
```

Ask (multi‑PDF):

```bash
curl -X POST http://localhost:3000/api/ask \
	-H 'Content-Type: application/json' \
	-d '{"question":"Summarize the abstract of the latest documents","topK":6}'
```

Stream (multi‑PDF):

```bash
curl -N -X POST http://localhost:3000/api/ask/stream \
	-H 'Content-Type: application/json' \
	-d '{"question":"List the key methods","multiQuery":true}'
```

Ask (single latest PDF):

```bash
curl -X POST http://localhost:3000/api/ask/single \
	-H 'Content-Type: application/json' \
	-d '{"question":"What are the main conclusions?"}'
```

### SSE Events

Streaming endpoints emit:

| Event | Payload | Notes |
|-------|---------|-------|
| `meta` | `{ sources, docId? }` | Sent first with retrieval metadata |
| `token` | `{ token }` | Repeated partial answer chunks |
| `done` | `{}` | Completion marker |
| `error` | `{ error }` | On failure |

## Using the PDF Agent Programmatically

```ts
import { mastra } from './src/mastra';
const agent = mastra.getAgent('pdfAgent');
const stream = await agent.stream([{ role:'user', content:'What is the abstract about?' }]);
for await (const t of stream.textStream) process.stdout.write(t);
```

## GitHub Pages Deployment (Static Frontend)

The UI lives in `docs/` so enabling GitHub Pages (root: main branch, folder: /docs) will publish it.

Backend hosting options:

1. Self-host server (Render/Fly/Heroku/Vercel). Set `API_BASE_URL` global in `docs/index.html` or inject at runtime.
2. If no backend is deployed, upload & QA won’t function (Pages is static only).

To point the UI to a deployed backend, add before closing `</head>`:

```html
<!-- inject before </head> -->
<script>
	window.API_BASE_URL = 'https://your-backend.example.com';
</script>
```

## Run MCP Docs Server

```bash
npm run mcp:docs
```

<!-- Weather agent/workflow has been removed in this demo build. -->

## Internals

### Vector Store

`src/lib/vectorStore.ts` implements an in‑memory JSON‑persisted store with:

- Namespaces (`namespace: 'pdf'`)
- `docId` per PDF
- Cached token frequencies and BM25 IDF computation
- Hybrid ranking: `score = alpha * cosine + (1 - alpha) * sigmoid(BM25)`

### Manifest

`src/lib/manifest.ts` tracks PDFs (`.data/manifest.json`) with metadata (pages, chunk count, timestamps).

### Retrieval Tools

`retrieve-pdf-context` accepts `{ query, docIds?, topK?, hybridAlpha? }` and returns a stitched context + scored sources.

### Workflow

`pdfWorkflow` (see `src/mastra/workflows/pdf-workflow.ts`) standardizes retrieval + answer pipeline so both JSON and streaming routes can rely on a consistent process (telemetry-friendly).

### Security / Hardening (Basic)

- Rate limiting: 60 req / minute default
- Optional CORS origin restriction via `CORS_ORIGIN`
- No auth layer yet (add API key or JWT for production)

## Environment Variables

| Name | Description |
| ---- | ----------- |
| `OPENAI_API_KEY` | Required for embeddings + chat model |
| `CORS_ORIGIN` | Optional allowed origin for browser requests |
| `PORT` | Server port (default 3000) |

Create a `.env`:

```env
OPENAI_API_KEY=sk-...
CORS_ORIGIN=http://localhost:3000
```

## Tuning Guidance

| Parameter | Effect | Trade‑off |
|-----------|--------|-----------|
| `hybridAlpha` | Higher = more semantic | Too high may ignore exact keywords |
| `topK` | More chunks = broader context | Larger responses, slower |
| `multiQuery` | Recall across paraphrases | Extra embedding + API cost |
| `qVariants` | More alt queries | Diminishing returns >5 |
| `maxContextChars` | Caps context size | Too small omits evidence |

Suggested starting adjustments: increase `topK` to 8 and `qVariants` to 5 for broad exploratory queries.

## Notes

Current implementation is demo-grade:

- Simple JSON persistence (not concurrent-safe)
- Naive fixed-size chunking
- No streaming answer endpoint yet (agent streaming consumed server-side)
- No source highlighting in UI

## Debugging Tips

- Add `debug: true` in `retrieve()` (already default) to log query variants & scores.
- Inspect stored vectors: open `.data/pdf-vectors.json` (large files: use jq/less).
- Manifest corruption? Delete `.data/manifest.json` and re‑upload.
- Low lexical score: lower `hybridAlpha` (e.g., 0.55) for keyword heavy questions.
- Too many irrelevant chunks: reduce `topK` or lower `qVariants`.

## Next Improvements

- SSE / WebSocket answer streaming
- Source highlighting + per-chunk confidence
- Advanced chunking (semantic / layout-aware)
- Deduplication & compression of vectors
- Per-user isolation & auth
- Background ingestion queue for large docs
- Tests (planned) for retrieval quality & BM25 normalization
