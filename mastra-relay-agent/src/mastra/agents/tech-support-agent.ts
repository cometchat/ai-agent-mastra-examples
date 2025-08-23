import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

export const techSupportAgent = new Agent({
  name: 'Tech Support Agent',
  instructions: `You are a technical support specialist. Handle all tech-related queries.`,
  model: openai('gpt-5'),
});
