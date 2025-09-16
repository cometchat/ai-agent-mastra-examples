# Mastra PDF Agent

Hybrid semantic + lexical (BM25) retrieval over multiple uploaded PDFs with a Mastra Agent. Production‑inspired patterns: document manifest, namespaced vector store, hybrid ranking, rate limiting, and extensible tooling.

## Contents

- `src/mastra/index.ts`: Bootstraps the Mastra instance
- `src/mastra/agents/pdf-agent.ts`: PDF QA agent for question answering over uploaded documents
- `src/server.ts`: Express server for PDF upload + QA endpoints
- `docs/index.html`: GitHub Pages demo UI (upload + preview + chat widget placeholder)
- `mastra.mcp.json`: MCP server configuration

## Prerequisites

- Node.js >= 20.9.0
- OPENAI_API_KEY in environment (for embeddings + model)

## Install

```bash
npm install
```

## Development

Run Mastra dev environment (hot reload):

```bash
npm run dev
```

Run PDF QA server (Express):
```bash
npm run serve
```
Server defaults to http://localhost:3000

## Endpoints

Base URL defaults to `http://localhost:3000` unless deployed.

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/upload` | multipart/form-data field `file` – ingests a PDF, returns `{ docId, pages, chunks }` |
| GET | `/api/documents` | Lists ingested documents (manifest) |
| DELETE | `/api/documents/:id` | Deletes a document (vectors + stored PDF + manifest entry) |
| POST | `/api/ask` | JSON: `{ question, docIds?, topK?, hybridAlpha? }` → `{ answer }` |

Parameters:

- `docIds` (optional array) – restrict retrieval to specific documents; default searches all.
- `topK` – number of chunks to retrieve (default 5).
- `hybridAlpha` – weight for semantic score (0..1, default 0.7). Lower = more lexical influence.

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

### Retrieval Tool

`retrieve-pdf-context` accepts `{ query, docIds?, topK?, hybridAlpha? }` and returns a stitched context + scored sources.

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

## Notes

Current implementation is demo-grade:

- Simple JSON persistence (not concurrent-safe)
- Naive fixed-size chunking
- No streaming answer endpoint yet (agent streaming consumed server-side)
- No source highlighting in UI

## Next Improvements

- SSE / WebSocket answer streaming
- Source highlighting + per-chunk confidence
- Advanced chunking (semantic / layout-aware)
- Deduplication & compression of vectors
- Per-user isolation & auth
- Background ingestion queue for large docs
- Tests (planned) for retrieval quality & BM25 normalization
