# Mastra Backend Tools Agent

Create a Mastra agent that performs secure backend actions (e.g., fetch deals) via server-side tools, then returns concise, tool-grounded answers.

## What you'll build

- A chat agent (e.g., `deals`) that invokes a backend tool when live data is needed
- A server-side tool (e.g., `get-deals`) that calls your service/DB and returns structured results
- A chat endpoint that composes responses grounded in tool output

## Prerequisites

- Node.js installed
- A Mastra project
- CometChat app
- Environment: `.env` with `OPENAI_API_KEY`

## Quickstart

1. Install and run locally:

```bash
npm install
npx mastra dev
```

2) Ask the agent:

```bash
curl -s -X POST http://localhost:4111/api/agents/deals/generate \
	-H 'Content-Type: application/json' \
	-d '{"messages":[{"role":"user","content":"@agent what are the current deals?"}]}'
```

## How it works

1) The agent decides to use `get-deals` when the user asks about deals/pricing/promos.
2) The tool executes on the server with secrets, returns structured data.
3) The agent summarizes and replies using recent tool results; no secrets leave the server.

## API

- POST `/api/agents/deals/generate` — Chat with the agent and retrieve action-backed responses

Expected local base: `http://localhost:4111/api`

## Project structure

- Agent: `src/mastra/agents/deals-agent.ts`
- Tools: `src/mastra/tools/get-deals-tool.ts`, `src/mastra/tools/index.ts`
- Server: `src/mastra/index.ts`
- Workflows: `src/mastra/workflows/index.ts`

## Environment variables

- `OPENAI_API_KEY` — Your OpenAI key

## Connect to CometChat

1) In CometChat Dashboard → AI Agents, set Provider = Mastra
2) Agent ID = `deals`
3) Deployment URL = your public `/api/agents/deals/generate`
4) Enable and save

## Security checklist

- Add auth (API key/JWT), CORS restrictions, and rate limiting
- Validate inputs and sanitize logs/responses
- Keep secrets in server-side env only

## Troubleshooting

- No tool runs: ensure `get-deals` tool is registered and agent uses it
- Upstream errors: add retry/backoff and inspect server logs
- Agent not found: confirm server registers agent key `deals`

## Links

- Docs: [Backend Tools Agent](https://cometchat-22654f5b-docs-navigation.mintlify.app/ai-agents/mastra-backend-tools-agent)
- Repo: [GitHub](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-backend-tools-agent)
