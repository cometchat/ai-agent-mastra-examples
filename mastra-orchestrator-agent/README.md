# Mastra Orchestrator Agent

Create an orchestrator agent that classifies user intent and routes to the best specialist (billing, support, tech support, manager, or human rep).

## What you'll build

- An orchestrator agent that detects intent and orchestrates a handoff
- Specialist agents that answer specific domains
- An orchestrator tool + workflow to perform the selection and preserve context

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

2) Ask the orchestrator (agent id is `orchestratorAgent`):

```bash
curl -s -X POST http://localhost:4111/api/agents/orchestratorAgent/generate \
	-H 'Content-Type: application/json' \
	-d '{"messages":[{"role":"user","content":"@agent I need help with my invoice charges"}]}'
```

The response ends with a short line like `([routedTo] | escalated: yes/no)`. Check logs to see which specialist handled the request.

## How it works

1) The orchestrator understands the request and selects a specialist.
2) The orchestrator tool + workflow perform the handoff, forwarding relevant context.
3) The specialist generates the answer; the orchestrator returns the final message.

## API

- POST `/api/agents/orchestratorAgent/generate` — Chat with the orchestrator and receive routed responses

Expected local base: `http://localhost:4111/api`

## Project structure

- Orchestrator: `src/mastra/agents/orchestrator-agent.ts`
- Specialists: `src/mastra/agents/{billing,support,tech-support,manager,human-rep}-agent.ts`
- Tool: `src/mastra/tools/orchestrator-tool.ts`
- Workflow: `src/mastra/workflows/orchestrator-workflow.ts`
- Server: `src/mastra/index.ts`

## Environment variables

- `OPENAI_API_KEY` — Your OpenAI key

## Connect to CometChat

1) In CometChat Dashboard → AI Agents, set Provider = Mastra
2) Agent ID = `orchestratorAgent`
3) Deployment URL = your public `/api/agents/orchestratorAgent/generate`
4) Enable and save

## Security checklist

- Auth (API key/JWT), CORS, and rate limiting
- Validate inputs and sanitize logs/responses
- Monitor orchestration distribution and set fallbacks

## Troubleshooting

- Wrong specialist: refine orchestrator prompts or routing criteria
- Agent not found: confirm orchestrator and specialists are registered
- No response: check server logs and tool/workflow wiring

## Links

- Docs: [Orchestrator Agent](https://www.cometchat.com/docs/ai-agents/mastra-coordinator-agent)
- Repo: [GitHub](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-orchestrator-agent)
