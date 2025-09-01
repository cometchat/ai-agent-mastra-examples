import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getTopProductsByDay, searchProducts } from '../../services/producthunt.js';

export const topProductsTool = createTool({
  id: 'get-top-products',
  description: 'Get top 3 Product Hunt posts for a given day (YYYY-MM-DD)',
  inputSchema: z.object({
    date: z.string().describe('Day in YYYY-MM-DD format'),
  }),
  outputSchema: z.object({
    posts: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          tagline: z.string().optional(),
          url: z.string().optional(),
          website: z.string().optional(),
          votesCount: z.number().optional(),
          thumbnail: z.string().optional(),
        }),
      )
      .describe('Top 3 posts'),
  }),
  execute: async ({ context }) => {
    const date = context.date;
    const posts = await getTopProductsByDay(date);
    return {
      posts: posts.map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        url: p.url,
        website: p.website,
        votesCount: p.votesCount,
        thumbnail: p.thumbnail,
      })),
    };
  },
});

export const searchProductsTool = createTool({
  id: 'search-products',
  description: 'Search Product Hunt posts by keyword using Algolia',
  inputSchema: z.object({
    query: z.string().describe('Search keywords'),
  }),
  outputSchema: z.object({
    hits: z.array(
      z.object({
        id: z.string().optional(),
        objectID: z.string().optional(),
        name: z.string(),
        tagline: z.string().optional(),
        url: z.string().optional(),
        website: z.string().optional(),
        votesCount: z.number().optional(),
        thumbnail: z.string().optional(),
      }),
    ),
  }),
  execute: async ({ context }) => {
    const hits = await searchProducts(context.query);
    return {
      hits: hits.map((h: any) => ({
        id: h.objectID,
        objectID: h.objectID,
        name: h.name,
        tagline: h.tagline,
        url: h.url,
        website: h.website,
        votesCount: h.votesCount,
        thumbnail: h.thumbnail,
      })),
    };
  },
});
