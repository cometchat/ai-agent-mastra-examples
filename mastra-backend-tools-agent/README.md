# Mastra Backend Tools Agent

An agent that performs secure backend actions (e.g., fetch deals) using server-side tools.

## Features
- Invokes backend tools for live data (e.g., deals, pricing)
- Tool runs securely on the server and returns structured results
- API endpoint for chat and tool-backed responses

## Setup
1. Add OpenAI API key to `.env`.
2. Run the Mastra server.
3. Ask questions via `/api/agents/deals/generate`.
4. Connect to CometChat as an AI Agent.

## Project Structure
- Agent: `src/mastra/agents/deals-agent.ts`
- Tool: `src/mastra/tools/get-deals-tool.ts`
- Server: `src/mastra/index.ts`

## Security
Protect endpoints, validate inputs, and keep secrets server-side.

## Links
- [CometChat AI Agents Docs](https://cometchat-22654f5b-docs-navigation.mintlify.app/ai-agents/overview)
- [Mastra Backend Tools Agent Repo](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-backend-tools-agent)
