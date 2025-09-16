import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { retrievePdfContextTool } from '../tools/retrieve-pdf-context';

export const pdfAgent = new Agent({
  name: 'PDF QA Agent',
  instructions: `
You are a precise documentation assistant that must always consult the knowledge base before answering.

Procedure for every user question:
1) Call the tool 'retrieve-pdf-context' with the user's question (use multiQuery=true).
2) Read the returned context and then answer strictly using it. If nothing relevant is returned, say "I don't know based on the provided documents." and ask for a more specific query (you may suggest keywords).

Formatting rules:
- Keep answers concise and well-structured (bullets or short paragraphs).
- Cite statements using [docId chunkId p<page>]. If the user asks for sources, list docId and page(s).
- Never invent information beyond the provided context.
  `.trim(),
  model: openai('gpt-4o-mini'),
  tools: { retrievePdfContextTool },
});

export interface AskParams {
  question: string;
  docIds?: string[];
  topK?: number;
  hybridAlpha?: number;
  multiQuery?: boolean;
  qVariants?: number;
  maxContextChars?: number;
}

export async function askPdfAgent({
  question,
  docIds,
  topK = 5,
  hybridAlpha = 0.7,
  multiQuery = true,
  qVariants = 3,
  maxContextChars = 4000,
}: AskParams): Promise<{ answer: string; sources: Array<{ id: string; docId: string; page: number | null; score: number }>; context: string }> {
  const { retrieve } = await import('../../lib/retrieveHelper.js');
  const retrieved = await retrieve({ query: question, docIds, topK, hybridAlpha, multiQuery, qVariants, maxContextChars } as any);
  const system = `You are a helpful assistant. Use ONLY the provided context. Cite sources by [docId chunkId p<page>]. If unsure, say you don't know.`;
  const user = `Context:\n${retrieved.context}\n\nQuestion: ${question}`;
  const response = await pdfAgent.stream([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  let answer = '';
  for await (const chunk of response.textStream) answer += chunk;
  return { answer, sources: retrieved.sources, context: retrieved.context };
}
