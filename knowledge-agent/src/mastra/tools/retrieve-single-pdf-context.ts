import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Tool restricted to a single (latest if unspecified) docId
export const retrieveSinglePdfContextTool = createTool({
  id: 'retrieve-single-pdf-context',
  description: 'Retrieve context from the most recently uploaded PDF by default (or a specified docId if provided), restricted to that single PDF using hybrid hybrid semantic+BM25 search',
  inputSchema: z.object({
    query: z.string().describe('User question'),
    docId: z.string().min(1).optional().describe('(Optional) PDF docId; if omitted the most recently added document is used'),
    topK: z.number().optional().default(5),
    hybridAlpha: z.number().min(0).max(1).optional().default(0.7),
    multiQuery: z.boolean().optional().default(true),
    qVariants: z.number().min(1).max(6).optional().default(3),
    maxContextChars: z.number().min(500).max(12000).optional().default(4000),
  }),
  outputSchema: z.object({
    context: z.string(),
    sources: z.array(z.object({ id: z.string(), docId: z.string(), page: z.number().nullable(), score: z.number() })),
  }),
  execute: async ({ context }) => {
    const { retrieve } = await import('../../lib/retrieveHelper.js');
    const { loadManifest } = await import('../../lib/manifest');
    let docId = context.docId;
    if (!docId) {
      const manifest = loadManifest();
      if (!manifest.length) return { context: '', sources: [] };
      // pick most recently created (assuming createdAt field)
      manifest.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      docId = manifest[0].docId;
    }
    // Force single docId constraint
    const { context: ctx, sources } = await retrieve({
      query: context.query,
      docIds: [docId],
      topK: context.topK,
      hybridAlpha: context.hybridAlpha,
      multiQuery: context.multiQuery,
      qVariants: context.qVariants,
      maxContextChars: context.maxContextChars,
    } as any);
    return { context: ctx, sources };
  },
});
