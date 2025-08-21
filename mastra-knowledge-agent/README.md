# Weather Agent Template

This is a template project that demonstrates how to create a weather agent using the Mastra framework. The agent can provide weather information and forecasts based on user queries.

## Overview

The Weather Agent template showcases how to:

- Create an AI-powered agent using Mastra framework
- Implement weather-related workflows
- Handle user queries about weather conditions
- Integrate with OpenAI's API for natural language processing

## Setup

1. Copy `.env.example` to `.env` and fill in your API keys.
2. Install dependencies: `pnpm install`
3. Run the project: `pnpm dev`.

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key. [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)


## Knowledge Agent Quickstart

1. Install deps:

```bash
npm i axios cheerio pdf-parse
```

2. Run dev:

```bash
npx mastra dev
```

3. Ingest sources then ask a question via HTTP:

```bash
curl -s -X POST http://localhost:4111/api/tools/ingestSources \
 -H 'Content-Type: application/json' \
 -d '{"sources":["https://mastra.ai/blog/introducing-mastra-mcp"], "namespace":"mastra"}'

curl -s -X POST http://localhost:4111/api/agents/knowledge/generate \
 -H 'Content-Type: application/json' \
 -d '{"messages":[{"role":"user","content":"Summarize MCP support in Mastra"}], "toolParams": {"namespace":"mastra"}}'
```
