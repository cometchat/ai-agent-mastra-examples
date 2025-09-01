# Mastra Coordinator (Relay) Agent

Create a coordinator/relay agent that classifies user intent and routes to the best specialist (billing, support, tech support, manager, or human rep).

## What you'll build

- A relay agent that detects intent and orchestrates a handoff
- Specialist agents that answer specific domains
- A routing tool + workflow to perform the selection and preserve context

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

2) Ask the relay:

```bash
curl -s -X POST http://localhost:4111/api/agents/relay/generate \
	-H 'Content-Type: application/json' \
	-d '{"messages":[{"role":"user","content":"@agent I need help with my invoice charges"}]}'
```

Check logs to see which specialist handled the request.

## How it works

1) The relay understands the request and selects a specialist.
2) The routing tool + workflow perform the handoff, forwarding relevant context.
3) The specialist generates the answer; the relay returns the final message.

## API

- POST `/api/agents/relay/generate` — Chat with the relay and receive routed responses

Expected local base: `http://localhost:4111/api`

## Project structure

- Relay: `src/mastra/agents/relay-agent.ts`
- Specialists: `src/mastra/agents/{billing,support,tech-support,manager,human-rep}-agent.ts`
- Tool: `src/mastra/tools/relay-route-tool.ts`
- Workflow: `src/mastra/workflows/relay-workflow.ts`
- Server: `src/mastra/index.ts`

## Environment variables

- `OPENAI_API_KEY` — Your OpenAI key

## Connect to CometChat

1) In CometChat Dashboard → AI Agents, set Provider = Mastra
2) Agent ID = `relay`
3) Deployment URL = your public `/api/agents/relay/generate`
4) Enable and save

## Security checklist

- Auth (API key/JWT), CORS, and rate limiting
- Validate inputs and sanitize logs/responses
- Monitor routing distribution and set fallbacks

## Troubleshooting

- Wrong specialist: refine relay prompts or routing criteria
- Agent not found: confirm relay and specialists are registered
- No response: check server logs and tool/workflow wiring

## Links

- Docs: [Coordinator Agent](https://www.cometchat.com/docs/ai-agents/mastra-coordinator-agent)
- Repo: [GitHub](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-coordinator-agent)
