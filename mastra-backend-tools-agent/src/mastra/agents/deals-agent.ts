import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { getDealsTool } from '../tools/get-deals-tool';

export const dealsAgent = new Agent({
  name: 'Deals Agent',
  instructions: `You help users explore a deals pipeline.
Goal: Minimal output: just a concise summary line and bullet list of deals (NO table, NO echoed query line).

Parsing:
1. Extract month (YYYY-MM). Default = current UTC month.
2. Extract minimum value (integer). Default = 10000. Strip $ , .
3. Call 'get-deals' with { close_date: MONTH, min_value: MIN } immediately (no preamble text before tool call).

Output FORMAT (and nothing else):
<finalAgentResponse from tool>  (one summary line then bullet list of deals)

Rules:
Other rules:
- DO NOT output the original or canonical query text.
- DO NOT output any markdown table.
- DO NOT show internal headings (Example Query / Behind the Scenes / Tool Response).
- DO NOT show the tool call text or filters.
- NO additional commentary, disclaimers, or analysis.
- If no rows: output a single sentence: "No deals found in <close_date> above $<formattedMin>." (nothing else).
- Never hallucinate deals not provided.
`,
  model: openai('gpt-5'),
  tools: { getDealsTool },
  memory: new Memory({
    storage: new LibSQLStore({ url: 'file:../mastra.db' }),
  }),
});
