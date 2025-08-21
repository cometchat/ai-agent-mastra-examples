// src/mastra/agents/knowledge-agent.ts
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { docsRetriever } from '../tools'; 
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const knowledgeAgent = new Agent({
  name: 'knowledge',
  model: openai('gpt-5'),
  tools: { docsRetriever },
  memory: new Memory({
    storage: new LibSQLStore({
      // path is relative to the .mastra/output directory
      url: 'file:../mastra.db',
    }),
  }),
  instructions: `
You are a precise documentation & research assistant.

Always ground answers by calling the "docsRetriever" tool.
Use namespace "default" unless the user explicitly names a different namespace/topic.

When answering:
- Use retrieved snippets to compose a concise answer.
- End with a short "Sources:" list of file basenames (comma-separated).
- If nothing is found, say so and suggest what to ingest (do not ask the user to upload).

If the user names a specific namespace, pass that namespace to "docsRetriever". Otherwise use "default".
  `.trim(),
});