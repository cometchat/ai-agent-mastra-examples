# Mastra Frontend Actions Agent

Create a Mastra agent that can trigger UI actions via frontend tools (e.g., confetti) by returning safe, structured tool calls that your client executes.

## What you'll build

- A chat agent that responds and may include a tool call like `{ id: "confetti", args: {...} }`.
- A small client-side tool registry that maps IDs to functions and runs them.
- A server endpoint to chat with the agent and receive tool instructions.

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

2) Call the agent API:

```bash
curl -s -X POST http://localhost:4111/api/agents/celebration/generate \
	-H 'Content-Type: application/json' \
	-d '{"messages":[{"role":"user","content":"@agent celebrate our product launch with confetti"}]}'
```

Inspect the JSON response for a tool call. Your frontend should detect it and run `confetti()`.

## How it works

1) The agent decides when to request a UI action (e.g., celebratory moments).
2) The server returns both a normal chat message and a structured tool call.
3) The browser reads tool calls and executes mapped functions (see `widget/index.html`).

## API

- POST `/api/agents/celebration/generate` — Chat with the agent and receive tool instructions

Expected local base: `http://localhost:4111/api`

## Project structure

- Agent: `src/mastra/agents/celebration-agent.ts`
- Tools: `src/mastra/tools/confetti-tool.ts`, `src/mastra/tools/index.ts`
- Server: `src/mastra/index.ts`
- Frontend sample: `widget/index.html`
- Workflows: `src/mastra/workflows/index.ts`

## Environment variables

- `OPENAI_API_KEY` — Your OpenAI key

## Connect to CometChat

1) In CometChat Dashboard → AI Agents, set Provider = Mastra
2) Agent ID = `celebration`
3) Deployment URL = your public `/api/agents/celebration/generate`
4) Enable and save

## Security checklist

- Validate and sanitize tool calls
- Keep secrets on the server
- Add auth (API key/JWT), CORS restrictions, and rate limiting

## Troubleshooting

- No tool runs: verify frontend parses tool calls and maps IDs to functions
- Agent not found: confirm server registers `celebration` agent
- 401/403: check auth headers and CORS

## Links

- Docs: [Frontend Actions Agent](https://www.cometchat.com/docs/ai-agents/mastra-frontend-actions-agent)
- Repo: [GitHub](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-frontend-actions-agent)
