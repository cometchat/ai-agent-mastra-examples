import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { retrieveSinglePdfContextTool } from '../tools/retrieve-single-pdf-context';

export const singlePdfAgent = new Agent({
  name: 'Single PDF Agent',
  instructions: `You answer questions ONLY from the context of the most recently uploaded single PDF. Always first call the tool retrieve-single-pdf-context (omit docId unless you are retrying a failed call). If the tool returns no context, respond exactly with: "I don't know based on the provided PDF." Never reference or speculate about other documents.`.trim(),
  model: openai('gpt-4o'),
  tools: { retrieveSinglePdfContextTool },
});

export interface SingleAskParams {
  question: string;
  topK?: number;
  hybridAlpha?: number;
  multiQuery?: boolean;
  qVariants?: number;
  maxContextChars?: number;
}

export async function askSinglePdfAgent({
  question,
  topK = 5,
  hybridAlpha = 0.7,
  multiQuery = true,
  qVariants = 3,
  maxContextChars = 4000,
}: SingleAskParams): Promise<{ answer: string; sources: Array<{ id: string; docId: string; page: number | null; score: number }>; context: string }> {
  const { retrieve } = await import('../../lib/retrieveHelper.js');
  const { loadManifest } = await import('../../lib/manifest');

  const manifest = loadManifest();
  if (!manifest.length) {
    return { answer: "No PDF uploaded yet.", sources: [], context: '' };
  }
  // newest by createdAt
  manifest.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latestDocId = manifest[0].docId;

  const retrieved = await retrieve({
    query: question,
    docIds: [latestDocId],
    topK,
    hybridAlpha,
    multiQuery,
    qVariants,
    maxContextChars,
  } as any);

  const system = `You are a helpful assistant limited strictly to the most recently uploaded single PDF context. If unsure, say you don't know.`;
  const user = `Context (single PDF):\n${retrieved.context}\n\nQuestion: ${question}`;
  const response = await singlePdfAgent.stream([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  let answer = '';
  for await (const chunk of response.textStream) answer += chunk;
  return { answer, sources: retrieved.sources, context: retrieved.context };
}
