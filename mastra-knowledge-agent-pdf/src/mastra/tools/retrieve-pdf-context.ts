import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Tool: retrieve context from uploaded PDFs using hybrid search
export const retrievePdfContextTool = createTool({
  id: 'retrieve-pdf-context',
  description: 'Hybrid semantic + lexical retrieval over uploaded PDF chunks',
  inputSchema: z.object({
    query: z.string().describe('Natural language question to search for'),
    topK: z.number().optional().default(5),
    docIds: z.array(z.string()).optional().default([]),
    hybridAlpha: z.number().min(0).max(1).optional().default(0.7),
    multiQuery: z.boolean().optional().default(true).describe('Use multi-query expansion to improve recall'),
    qVariants: z.number().min(1).max(6).optional().default(3),
    maxContextChars: z.number().min(500).max(12000).optional().default(4000),
  }),
  outputSchema: z.object({
    context: z.string(),
    sources: z.array(z.object({ id: z.string(), page: z.number().nullable(), score: z.number(), docId: z.string() })),
  }),
  execute: async ({ context }) => {
    const { retrieve } = await import('../../lib/retrieveHelper.js');
    let { context: ctx, sources } = await retrieve({
      query: context.query,
      docIds: context.docIds,
      topK: context.topK,
      hybridAlpha: context.hybridAlpha,
      multiQuery: context.multiQuery,
      qVariants: context.qVariants,
      maxContextChars: context.maxContextChars,
    } as any);
    // fallback broadening if nothing found
    if ((!ctx || !ctx.trim()) || !sources?.length) {
      const retry = await retrieve({
        query: context.query,
        docIds: context.docIds,
        topK: Math.max(context.topK ?? 5, 8),
        hybridAlpha: context.hybridAlpha ?? 0.6,
        multiQuery: true,
        qVariants: Math.max(context.qVariants ?? 3, 5),
        maxContextChars: context.maxContextChars ?? 4000,
      } as any);
      ctx = retry.context;
      sources = retry.sources;
    }
    return { context: ctx, sources };
  },
});

