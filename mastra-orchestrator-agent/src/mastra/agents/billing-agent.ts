import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

export const billingAgent = new Agent({
  name: 'Billing Agent',
  instructions: `You are a billing specialist. Handle all billing-related queries.`,
  model: openai('gpt-5'),
});
