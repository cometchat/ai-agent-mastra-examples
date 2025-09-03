import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getTopProductsByVotes, searchProducts, getTopProductsByTimeframe, parseTimeframe } from '../../services/producthunt.js';

export const topProductsTool = createTool({
  id: 'get-top-products',
  description: 'Get the top 3 Product Hunt posts by total votes (all-time).',
  inputSchema: z.object({}),
  outputSchema: z.object({
    posts: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          tagline: z.string().optional(),
          url: z.string().optional(),
          votesCount: z.number().optional(),
        }),
      )
      .describe('Top 3 posts'),
    table: z.string().describe('Markdown table of top posts'),
  }),
  execute: async () => {
    const posts = await getTopProductsByVotes(3);
    const toCell = (v: any) => (v == null ? '-' : String(v).replace(/\|/g, '\\|'));
    const rows = posts.map((p: any, i: number) => `| ${i + 1} | ${toCell(p.name)} | ${toCell(p.tagline)} | ${toCell(p.votesCount)} | ${p.url ? `[link](${p.url})` : '-'} |`);
    const table = [
      '| Rank | Name | Tagline | Votes | Link |',
      '| ---: | --- | --- | ---: | --- |',
      ...rows,
    ].join('\n');
    return {
      posts: posts.map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        url: p.url,
        votesCount: p.votesCount,
      })),
      table,
    };
  },
});

export const searchProductsTool = createTool({
  id: 'search-products',
  description: 'Search Product Hunt posts by keyword using Algolia',
  inputSchema: z.object({
    query: z.string().describe('Search keywords (natural language is okay)'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Max results to return (1-50, default 10).'),
  }),
  outputSchema: z.object({
    hits: z.array(
      z.object({
        id: z.string().optional(),
        objectID: z.string().optional(),
        name: z.string(),
        tagline: z.string().optional(),
        url: z.string().optional(),
        votesCount: z.number().optional(),
      }),
    ),
  }),
  execute: async ({ context }) => {
    const limit = Math.max(1, Math.min(50, Number((context as any).limit ?? 10)));
    const hits = await searchProducts((context as any).query, { limit });
    return {
      hits: hits.map((h: any) => ({
        id: h.objectID,
        objectID: h.objectID,
        name: h.name,
        tagline: h.tagline,
        url: h.url,
        votesCount: h.votesCount,
      })),
    };
  },
});

export const topProductsByTimeframeTool = createTool({
  id: 'get-top-products-by-timeframe',
  description:
    'Get top Product Hunt posts for a timeframe (default: today in America/New_York). Timeframes: today, yesterday, this-week, last-week, this-month, last-month, YYYY-MM-DD, or ranges like "from:2024-08-01 to:2024-08-15".',
  inputSchema: z
    .object({
      timeframe: z
        .string()
        .optional()
        .describe('Natural timeframe, e.g. "today", "this-week", "2024-09-01". Defaults to today.'),
      tz: z
        .string()
        .optional()
        .describe('IANA timezone, e.g. "America/New_York". Defaults to America/New_York.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('Number of posts to return (1-10, default 3).'),
    }),
  outputSchema: z.object({
    posts: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        tagline: z.string().optional(),
        url: z.string().optional(),
        votesCount: z.number().optional(),
      }),
    ),
    timeframe: z.string(),
    tz: z.string(),
    window: z.object({ postedAfter: z.string(), postedBefore: z.string() }).optional(),
    table: z.string().describe('Markdown table of top posts for timeframe'),
  }),
  execute: async ({ context }) => {
    const timeframe = (context?.timeframe || 'today').toString();
    const tz = (context?.tz || 'America/New_York').toString();
    const limit = Math.max(1, Math.min(10, Number(context?.limit ?? 3)));
    const window = parseTimeframe(timeframe, tz);
    const posts = await getTopProductsByTimeframe({ first: limit, timeframe, tz });
    const toCell = (v: any) => (v == null ? '-' : String(v).replace(/\|/g, '\\|'));
    const rows = posts.map((p: any, i: number) => `| ${i + 1} | ${toCell(p.name)} | ${toCell(p.tagline)} | ${toCell(p.votesCount)} | ${p.url ? `[link](${p.url})` : '-'} |`);
    const table = [
      '| Rank | Name | Tagline | Votes | Link |',
      '| ---: | --- | --- | ---: | --- |',
      ...rows,
    ].join('\n');
    return {
      posts: posts.map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        url: p.url,
        votesCount: p.votesCount,
      })),
      timeframe,
      tz,
      window: { postedAfter: window.postedAfter, postedBefore: window.postedBefore },
      table,
    };
  },
});

/**
 * Frontend Action: Confetti
 * This tool returns a payload describing a confetti effect. The frontend should
 * listen for tool invocation results where tool.id === 'confetti-tool' and then
 * trigger a confetti animation (e.g. using `canvas-confetti`) with the returned
 * parameters.
 */
export const confettiTool = createTool({
  id: 'confetti-tool',
  description: "Trigger a celebratory confetti animation in the user's browser.",
  inputSchema: z
    .object({
      reason: z
        .string()
        .optional()
        .describe('Optional short reason or message to display with the confetti'),
      colors: z
        .array(z.string())
        .optional()
        .describe('Array of hex color strings for the confetti pieces'),
      particleCount: z
        .number()
        .int()
        .min(20)
        .max(1000)
        .optional()
        .describe('Number of particles to launch (default 200)'),
      spread: z
        .number()
        .min(1)
        .max(360)
        .optional()
        .describe('Spread angle in degrees (default 90)'),
      startVelocity: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe('Initial velocity of confetti (default 45)'),
      origin: z
        .object({
          x: z.number().min(0).max(1).optional().describe('Horizontal origin (0-1)'),
          y: z.number().min(0).max(1).optional().describe('Vertical origin (0-1)'),
        })
        .optional()
        .describe('Origin (normalized) of the confetti burst'),
      shapes: z
        .array(z.enum(['square', 'circle', 'star', 'triangle']))
        .optional()
        .describe('Preferred shapes (frontend may map to available shapes).'),
      ticks: z
        .number()
        .int()
        .min(10)
        .max(5000)
        .optional()
        .describe('How long the confetti should last in frames (default 200).'),
      disableSound: z
        .boolean()
        .optional()
        .describe('If true, frontend should not play any celebration sounds.'),
    }),
  outputSchema: z.object({
    action: z.literal('CONFETTI'),
    reason: z.string().optional(),
    colors: z.array(z.string()),
    particleCount: z.number(),
    spread: z.number(),
    startVelocity: z.number(),
    origin: z.object({ x: z.number(), y: z.number() }),
    shapes: z.array(z.string()).optional(),
    ticks: z.number(),
    disableSound: z.boolean().optional(),
    timestamp: z.string(),
  }),
  execute: async ({ context }) => {
    const defaults = {
      colors: ['#ff577f', '#ff884b', '#ffd384', '#fff9b0', '#00c2ff', '#7b5cff'],
      particleCount: 200,
      spread: 90,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.5 },
      shapes: ['square', 'circle'],
      ticks: 200,
      disableSound: true,
    };

    const cfg = { ...defaults, ...(context || {}) } as any;

    return {
      action: 'CONFETTI' as const,
      reason: cfg.reason,
      colors: cfg.colors,
      particleCount: cfg.particleCount,
      spread: cfg.spread,
      startVelocity: cfg.startVelocity,
      origin: {
        x: cfg.origin?.x ?? defaults.origin.x,
        y: cfg.origin?.y ?? defaults.origin.y,
      },
      shapes: cfg.shapes,
      ticks: cfg.ticks,
      disableSound: cfg.disableSound,
      timestamp: new Date().toISOString(),
    };
  },
});
