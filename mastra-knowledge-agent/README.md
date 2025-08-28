
# Mastra Knowledge Agent

A retrieval-augmented agent that answers documentation questions by fetching relevant snippets from your docs and providing concise, cited responses in chat.

## Features

- Answers only from ingested docs
- Responds when explicitly mentioned (e.g., `@agent`)
- Returns answers with source citations
- API endpoints for ingestion, search, and chat

## Setup

1. Create a Mastra app and add your OpenAI API key to `.env`.

2. Ingest docs via `/api/tools/ingestSources`.

3. Ask questions via `/api/agents/knowledge/generate`.

4. Connect to CometChat as an AI Agent.

## Project Structure

- Agent: `src/mastra/agents/knowledge-agent.ts`
- Tools: `src/mastra/tools/docs-retriever.ts`, `ingest-sources.ts`
- Server: `src/mastra/index.ts`
- Knowledge base: `knowledge/`

## Security

Protect endpoints, validate inputs, and keep secrets server-side.

## Links

- [CometChat AI Agents Docs](https://cometchat-22654f5b-docs-navigation.mintlify.app/ai-agents/overview)
- [Mastra Knowledge Agent Repo](https://github.com/cometchat/ai-agent-mastra-examples/tree/main/mastra-knowledge-agent)
