# Mastra AI Agent Examples

This repository contains four Mastra-based AI agent examples integrated with CometChat. Each folder is a self-contained sample you can run locally and wire to CometChat AI Agents.

## Repository structure

- `mastra-knowledge-agent/` — Retrieval-augmented agent that answers from your docs with citations
- `mastra-frontend-actions-agent/` — Agent that triggers UI actions (e.g., confetti) via frontend tools
- `mastra-backend-tools-agent/` — Agent that performs secure server-side actions using tools
- `mastra-orchestrator-agent/` — Orchestrator that routes to specialist agents

## Prerequisites

- Node.js installed
- A Mastra project (or use these samples directly)
- CometChat app
- Environment: `.env` with `OPENAI_API_KEY` in each sample directory (copy from `.env.example` if present)

## Quickstart (any sample)

1. Change directory into a sample, install dependencies, and start the dev server:

```bash
cd <one-of-the-sample-folders>
npm install
npx mastra dev
```

1. Hit the sample's API using the curl commands in its README, or open the local Swagger UI at:

[http://localhost:4111/swagger-ui](http://localhost:4111/swagger-ui)

1. Connect to CometChat: Dashboard → AI Agents → Add Agent → Provider = Mastra. Use the sample's `Agent ID` and public `Deployment URL` for its `/api/agents/<name>/generate` endpoint.

## Samples overview

### Knowledge Agent

Answers documentation questions using only ingested sources and includes short citations.

- Folder: `mastra-knowledge-agent/`
- Key endpoints: `/api/tools/ingestSources`, `/api/tools/searchDocs`, `/api/agents/knowledge/generate`
- Docs: [Build Your Knowledge Agent with Mastra](https://www.cometchat.com/docs/ai-agents/mastra-knowledge-agent)

### Frontend Actions Agent

Returns safe, structured tool calls for the browser to run UI effects (e.g., confetti).

- Folder: `mastra-frontend-actions-agent/`
- Key endpoint: `/api/agents/celebration/generate`
- Docs: [Build Your Frontend Actions Agent with Mastra](https://www.cometchat.com/docs/ai-agents/mastra-frontend-actions-agent)

### Backend Tools Agent

Invokes secure server-side tools (e.g., deals API) and summarizes results for chat.

- Folder: `mastra-backend-tools-agent/`
- Key endpoint: `/api/agents/deals/generate`
- Docs: [Build Your Backend Tools Agent with Mastra](https://www.cometchat.com/docs/ai-agents/mastra-backend-tools-agent)

### Orchestrator Agent

Classifies intent and routes to specialist agents (billing, support, tech support, manager, human rep).

- Folder: `mastra-orchestrator-agent/`
- Key endpoint: `/api/agents/orchestratorAgent/generate`
- Docs: [Build Your Multi-agent Orchestration Agent with Mastra](https://www.cometchat.com/docs/ai-agents/mastra-coordinator-agent)

## Common tips

- Each sample may define its own scripts and structure; refer to its README for exact steps.
- Protect public endpoints with auth and CORS; keep API keys server-side only.
- Use the local Swagger UI to explore and test endpoints during development.

## Troubleshooting

- 404 for `/api/agents/<name>/generate`: ensure the agent is registered with the expected key.
- No tool/action triggered: verify tool registration and that the client or server is handling tool calls.
- Empty retrievals (Knowledge): verify ingestion and that `knowledge/<namespace>` contains parsed content.
