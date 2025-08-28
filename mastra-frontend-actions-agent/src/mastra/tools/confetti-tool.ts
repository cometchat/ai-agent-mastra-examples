import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Frontend Action: Confetti
 * This tool returns a payload describing a confetti effect. The frontend should
 * listen for tool invocation results where tool.id === 'show-confetti' and then
 * trigger a confetti animation (e.g. using `canvas-confetti`) with the returned
 * parameters.
 */
export const confettiTool = createTool({
  id: 'show-confetti',
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
    })
    .optional(),
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

    const cfg = { ...defaults, ...(context || {}) };

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
