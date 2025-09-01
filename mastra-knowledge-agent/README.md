
# Mastra Knowledge Agent

Create a retrieval-augmented agent that answers documentation questions when invoked, returning concise replies grounded in your docs with short source citations.

## What you'll build

- A Mastra agent that only responds when explicitly mentioned (e.g., `@agent`).
- Ingestion endpoints to load your knowledge into `knowledge/<namespace>`.
- Retrieval tooling that finds relevant snippets and returns citations.
- A chat endpoint to generate answers using only retrieved context.

## Prerequisites

- Node.js installed
- A Mastra project
- CometChat app
- Environment: `.env` with `OPENAI_API_KEY`

## Quickstart

1) Install deps (if not already):

```bash
npm install
```

2. Start the server (see package.json scripts; commonly):

```bash
npx mastra dev
```

3. Ingest sources, then ask a question:

```bash
curl -s -X POST http://localhost:4111/api/tools/ingestSources \
	-H 'Content-Type: application/json' \
	-d '{"sources":["https://mastra.ai/blog/introducing-mastra-mcp"], "namespace":"docs"}'

curl -s -X POST http://localhost:4111/api/agents/knowledge/generate \
	-H 'Content-Type: application/json' \
	-d '{"messages":[{"role":"user","content":"@agent summarize MCP support in Mastra"}], "toolParams": {"namespace":"docs"}}'
```

Swagger UI (local): [http://localhost:4111/swagger-ui](http://localhost:4111/swagger-ui)

## How it works

1) Ingest: `ingestSources` accepts URLs, files, or raw text and writes parsed `.md/.mdx` under `knowledge/<namespace>` for deterministic retrieval.
2) Retrieve: `docsRetriever` scans the knowledge folder, chunks and ranks snippets, and returns top matches with source metadata.
3) Generate: the agent composes a concise answer from retrieved context only and appends a short “Sources:” list.

## API

- POST `/api/tools/ingestSources` — Ingest URLs/files/text into `knowledge/<namespace>`
- POST `/api/tools/searchDocs` — Retrieve relevant snippets from `knowledge/<namespace>`
- POST `/api/agents/knowledge/generate` — Chat with the agent

Expected local base: `http://localhost:4111/api`

## Project structure

- Agent: `src/mastra/agents/knowledge-agent.ts`
- Tools: `src/mastra/tools/docs-retriever.ts`, `src/mastra/tools/ingest-sources.ts`, `src/mastra/tools/index.ts`
- Server: `src/mastra/index.ts`, `src/mastra/server/routes.ts`, `src/mastra/server/routes/ingest.ts`, `src/mastra/server/routes/searchDocs.ts`
- Knowledge base (sample): `knowledge/default/`
- Workflows: `src/mastra/workflows/index.ts`

## Environment variables

- `OPENAI_API_KEY` — Your OpenAI key

Keep secrets server-side only. Do not expose to the browser.

## Run locally

```bash
npm install
npx mastra dev
```

Then open Swagger UI to explore routes: [http://localhost:4111/swagger-ui](http://localhost:4111/swagger-ui)

## Connect to CometChat

1) In CometChat Dashboard → AI Agents, set Provider = Mastra
2) Agent ID = `knowledge`
3) Deployment URL = your public `/api/agents/knowledge/generate`
4) Enable and save

## Security checklist

- Add auth (API key/JWT) and restrict CORS to trusted origins
- Rate limit and bound payload sizes (ingestion and generate)
- Validate inputs (namespaces, URL/file whitelists, schemas)
- Sanitize errors and logs

## Troubleshooting

- No results: ensure `knowledge/<namespace>` has content or re-run ingestion
- Agent chat 404: confirm server registers agent with key `knowledge`
- Chatty agent: tighten instructions to answer only when mentioned and only from docs

## Next steps

- Add more tools (e.g., summarize, link-to-source)
- Use better chunking/embeddings for retrieval
- Restrict answers to whitelisted folders/domains

## Links

- CometChat AI Agents docs: [docs](https://www.cometchat.com/docs/ai-agents/mastra-knowledge-agent)
- Repo: [GitHub](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-knowledge-agent)
