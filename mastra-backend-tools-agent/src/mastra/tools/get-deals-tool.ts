import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// Simulated dataset (could be swapped for real DB/API later)
const ALL_DEALS = [
  { id: 'D-1032', customer: 'Acme Enterprises', stage: 'Negotiation', value: 15000, closeDate: '2025-08-22' },
  { id: 'D-1041', customer: 'BetaSoft Ltd.', stage: 'Proposal', value: 22500, closeDate: '2025-08-29' },
  { id: 'D-1050', customer: 'Zenith Global', stage: 'Verbal Yes', value: 47800, closeDate: '2025-08-30' },
  { id: 'D-1062', customer: 'NovaTech Solutions', stage: 'Contract Sent', value: 18300, closeDate: '2025-08-25' },
  { id: 'D-1075', customer: 'Orion Systems', stage: 'Final Review', value: 31600, closeDate: '2025-08-28' },
  // Some additional rows that will be filtered out (different month / value)
  { id: 'D-1080', customer: 'Helios Labs', stage: 'Discovery', value: 7200, closeDate: '2025-08-18' },
  { id: 'D-1091', customer: 'Quanta Corp', stage: 'Negotiation', value: 54000, closeDate: '2025-09-03' },
];

export const getDealsTool = createTool({
  id: 'get-deals',
  description: 'Return deals filtered by month (YYYY-MM) & minimum value, with a markdown table.',
  inputSchema: z.object({
    close_date: z.string().regex(/^\d{4}-\d{2}$/).describe('Month filter YYYY-MM'),
    min_value: z.number().int().min(0).default(0).describe('Minimum deal value in dollars'),
  }),
  outputSchema: z.object({
    action: z.literal('STATIC_DEALS'),
    toolCallText: z.string(),
    filters: z.object({ month: z.string(), minValue: z.number() }),
    columns: z.array(z.string()),
    rows: z.array(
      z.object({
        id: z.string(),
        customer: z.string(),
        stage: z.string(),
        value: z.number(),
        closeDate: z.string(),
        displayValue: z.string(),
        displayCloseDate: z.string(),
      })
    ),
    markdownTable: z.string(),
    finalAgentResponse: z.string(),
    timestamp: z.string(),
    total: z.number(),
  }),
  execute: async ({ context }) => {
    const { close_date, min_value } = context as { close_date: string; min_value: number };

    const monthPrefix = close_date + '-';
    const filtered = ALL_DEALS.filter(
      d => d.closeDate.startsWith(monthPrefix) && d.value >= min_value
    ).sort((a, b) => a.closeDate.localeCompare(b.closeDate));

    const rows = filtered.map(d => ({
      ...d,
      displayValue: `$${d.value.toLocaleString()}`,
      displayCloseDate: new Date(d.closeDate).toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric'
      }).replace(',', ''),
    }));

    const columns = ['Deal ID', 'Customer', 'Stage', 'Value', 'Close Date'];
    const markdownTableHeader = `| ${columns.join(' | ')} |\n| ${columns.map(() => '---').join(' | ')} |`;
    const markdownTableRows = rows
      .map(r => `| ${r.id} | ${r.customer} | ${r.stage} | ${r.displayValue} | ${r.displayCloseDate.split(' ').slice(0,3).join(' ')} |`)
      .join('\n');
    const markdownTable = `${markdownTableHeader}\n${markdownTableRows}`;

    const bullets = rows
      .map(r => `- ${r.customer} — ${r.displayValue} (${r.stage}, ${r.displayCloseDate.split(' ').slice(0,2).join(' ')})`)
      .join('\n');
    const finalAgentResponse = rows.length
      ? `Here ${rows.length === 1 ? 'is 1 deal' : `are ${rows.length} deals`} scheduled to close in ${close_date} above $${min_value.toLocaleString()}:\n\n${bullets}`
      : `No deals found in ${close_date} above $${min_value.toLocaleString()}.`;

    const toolCallText = `getDeals({\n  "close_date": "${close_date}",\n  "min_value": ${min_value}\n})`;

    return {
      action: 'STATIC_DEALS' as const,
      toolCallText,
      filters: { month: close_date, minValue: min_value },
      columns,
      rows,
      markdownTable,
      finalAgentResponse,
      timestamp: new Date().toISOString(),
      total: rows.length,
    };
  },
});
