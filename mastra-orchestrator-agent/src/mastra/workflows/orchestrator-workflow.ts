import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { OrchestratorAgent, OrchestratorResult } from '../agents/orchestrator-agent';

const internalOrchestrator = new OrchestratorAgent();

const routeQuestion = createStep({
  id: 'orchestrator-question',
  description: 'Route an incoming support question to the correct specialized (billing/tech/support) or human/manager escalation path.',
  inputSchema: z.object({
    question: z.string().min(3).describe('End-user support question'),
  }),
  outputSchema: z.object({
    answer: z.string(),
    routedTo: z.enum(['billing', 'tech', 'support', 'human', 'manager']),
    escalated: z.boolean(),
    escalationLevel: z.enum(['human', 'manager']).optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) throw new Error('Missing input');
    const result: OrchestratorResult = await internalOrchestrator.ask(inputData.question);
    // Explicitly return object matching output schema
    return {
      answer: result.answer,
      routedTo: result.routedTo,
      escalated: result.escalated,
      escalationLevel: result.escalationLevel,
    };
  },
});

export const orchestratorWorkflow = createWorkflow({
  id: 'orchestrator-workflow',
  inputSchema: z.object({
    question: z.string().min(3),
  }),
  outputSchema: z.object({
    answer: z.string(),
    routedTo: z.enum(['billing', 'tech', 'support', 'human', 'manager']),
    escalated: z.boolean(),
    escalationLevel: z.enum(['human', 'manager']).optional(),
  }),
})
  .then(routeQuestion)
  .commit();
