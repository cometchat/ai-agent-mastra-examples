import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { OrchestratorAgent, OrchestratorResult } from '../agents/orchestrator-agent';

const internalOrchestrator = new OrchestratorAgent();

export const orchestratorRouteTool = createTool({
  id: 'relay-route',
  description: 'Route a support question to the appropriate specialized or human endpoint and return the answer with routing metadata.',
  inputSchema: z.object({
    question: z.string().min(3),
    includeMetadata: z.boolean().optional().describe('If false, only answer string is returned (legacy mode).'),
  }),
  outputSchema: z.object({
    answer: z.string(),
    routedTo: z.enum(['billing', 'tech', 'support', 'human', 'manager']),
    escalated: z.boolean(),
    escalationLevel: z.enum(['human', 'manager']).optional(),
  }),
  execute: async ({ context }) => {
    const { question } = context as { question: string; includeMetadata?: boolean };
    const result: OrchestratorResult = await internalOrchestrator.ask(question);
    return {
      answer: result.answer,
      routedTo: result.routedTo,
      escalated: result.escalated,
      escalationLevel: result.escalationLevel,
    };
  },
});
