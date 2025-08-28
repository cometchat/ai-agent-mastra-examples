# Mastra Frontend Actions Agent

An agent that triggers frontend UI actions (e.g., confetti) in response to chat events.

## Features
- Requests UI actions via structured tool calls
- Client-side tool registry maps tool calls to functions
- API endpoint for chat and tool instructions

## Setup
1. Add OpenAI API key to `.env`.
2. Run the Mastra server.
3. Handle tool calls in your frontend (see `widget/index.html`).
4. Connect to CometChat as an AI Agent.

## Project Structure
- Agent: `src/mastra/agents/celebration-agent.ts`
- Tool: `src/mastra/tools/confetti-tool.ts`
- Frontend sample: `widget/index.html`

## Security
Validate and sanitize tool calls; keep sensitive logic on the server.

## Links
- [CometChat AI Agents Docs](https://cometchat-22654f5b-docs-navigation.mintlify.app/ai-agents/overview)
- [Mastra Frontend Actions Agent Repo](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-frontend-actions-agent)
