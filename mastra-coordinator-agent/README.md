# Mastra Coordinator (Relay) Agent

A relay agent that routes user requests to the appropriate specialist agent (billing, support, tech, manager, human rep).

## Features
- Classifies intent and routes to specialists
- Routing tool and workflow coordinate handoffs
- API endpoint for chat and routed responses

## Setup
1. Add OpenAI API key to `.env`.
2. Define relay and specialist agents.
3. Implement routing tool and workflow.
4. Register agents and expose relay endpoint.
5. Connect to CometChat as an AI Agent.

## Project Structure
- Relay agent: `src/mastra/agents/relay-agent.ts`
- Specialist agents: `src/mastra/agents/`
- Routing tool: `src/mastra/tools/relay-route-tool.ts`
- Workflow: `src/mastra/workflows/relay-workflow.ts`

## Security
Protect endpoints, validate inputs, and monitor routing.

## Links
- [CometChat AI Agents Docs](https://cometchat-22654f5b-docs-navigation.mintlify.app/ai-agents/overview)
- [Mastra Coordinator Agent Repo](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-coordinator-agent)
