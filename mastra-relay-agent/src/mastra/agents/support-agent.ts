import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const supportAgent = new Agent({
  name: 'Support Agent',
  instructions: `
    You are a general customer support agent. Answer common questions and resolve simple issues. If the query is about billing, technical problems, or needs escalation, indicate that in your response.
    If unsure, say 'Escalate'.
  `,
  model: openai('gpt-5'),
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});
