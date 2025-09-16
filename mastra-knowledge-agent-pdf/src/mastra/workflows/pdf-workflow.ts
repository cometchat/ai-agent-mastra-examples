import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const sourcesSchema = z.array(
  z.object({ id: z.string(), docId: z.string(), page: z.number().nullable(), score: z.number() })
);

const retrieveStep = createStep({
  id: 'retrieve-pdf',
  description: 'Retrieves stitched context from uploaded PDFs',
  inputSchema: z.object({
    question: z.string().describe('User question'),
    docIds: z.array(z.string()).optional(),
    topK: z.number().optional().default(5),
    hybridAlpha: z.number().optional().default(0.7),
    multiQuery: z.boolean().optional().default(true),
    qVariants: z.number().optional().default(3),
    maxContextChars: z.number().optional().default(4000),
  }),
  outputSchema: z.object({
    question: z.string(),
    context: z.string(),
    sources: sourcesSchema,
  }),
  execute: async ({ inputData }) => {
    if (!inputData) throw new Error('Missing input');
    const { retrieve } = await import('../../lib/retrieveHelper.js');
    const r = await retrieve({
      query: inputData.question,
      docIds: inputData.docIds,
      topK: inputData.topK,
      hybridAlpha: inputData.hybridAlpha,
      multiQuery: inputData.multiQuery,
      qVariants: inputData.qVariants,
      maxContextChars: inputData.maxContextChars,
    } as any);
    return { question: inputData.question, context: r.context, sources: r.sources };
  },
});

const answerStep = createStep({
  id: 'answer-with-agent',
  description: 'Answers using only the retrieved context',
  inputSchema: z.object({
    question: z.string(),
    context: z.string(),
    sources: sourcesSchema,
  }),
  outputSchema: z.object({
    answer: z.string(),
    sources: sourcesSchema,
    context: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!inputData) throw new Error('Missing input');
    const agent = mastra?.getAgent('pdfAgent');
    if (!agent) throw new Error('PDF agent not found');
    const system = `You are a helpful assistant. Use ONLY the provided context. Cite sources by [docId chunkId p<page>]. If unsure, say you don't know.`;
    const user = `Context:\n${inputData.context}\n\nQuestion: ${inputData.question}`;
    const stream = await agent.stream([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    let answer = '';
    for await (const t of stream.textStream) answer += t;
    return { answer, sources: inputData.sources, context: inputData.context };
  },
});

const pdfWorkflow = createWorkflow({
  id: 'pdfWorkflow',
  inputSchema: z.object({
    question: z.string(),
    docIds: z.array(z.string()).optional(),
    topK: z.number().optional(),
    hybridAlpha: z.number().optional(),
    multiQuery: z.boolean().optional(),
    qVariants: z.number().optional(),
    maxContextChars: z.number().optional(),
  }),
  outputSchema: z.object({
    answer: z.string(),
    sources: sourcesSchema,
    context: z.string(),
  }),
})
  .then(retrieveStep)
  .then(answerStep);

pdfWorkflow.commit();

export { pdfWorkflow };

