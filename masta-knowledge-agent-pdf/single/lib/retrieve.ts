import { singleVectorStore } from './store';
import { getEmbeddings } from '../../src/lib/embeddings';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface SingleRetrieveParams {
  query: string;
  docId: string; // strictly restrict to the single current doc
  topK?: number;
  hybridAlpha?: number;
  multiQuery?: boolean;
  qVariants?: number;
  maxContextChars?: number;
}

export async function retrieveSingle({
  query,
  docId,
  topK = 5,
  hybridAlpha = 0.7,
  multiQuery = true,
  qVariants = 3,
  maxContextChars = 4000,
}: SingleRetrieveParams) {
  const queries = await expandQueriesSafe(query, multiQuery ? qVariants : 1);
  const combined: any[] = [];
  for (const q of queries) {
    const embedding = (await getEmbeddings([q]))[0];
    const results = (singleVectorStore as any).searchHybrid(embedding, {
      query: q,
      docIds: [docId],
      topK,
      hybridAlpha,
      namespace: 'pdf',
    });
    combined.push(...results);
  }

  // dedupe by id keeping best score
  const byId = new Map<string, any>();
  for (const r of combined) {
    const prev = byId.get(r.id);
    if (!prev || r.score > prev.score) byId.set(r.id, r);
  }
  const ranked = Array.from(byId.values()).sort((a, b) => b.score - a.score).slice(0, topK);

  let used = 0;
  const stitched: string[] = [];
  for (const r of ranked) {
    const line = `[${r.docId} ${r.id.split(':').pop()} p${r.meta?.page}] ${r.text}`;
    if (used + line.length > maxContextChars) break;
    stitched.push(line);
    used += line.length + 1;
  }
  return {
    context: stitched.join('\n'),
    sources: ranked.map((r: any) => ({ id: r.id, docId: r.docId, page: r.meta?.page ?? null, score: r.score })),
  };
}

async function expandQueriesSafe(query: string, n: number) {
  if (n <= 1) return [query];
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.2,
      maxTokens: 120,
      prompt: `Generate ${n} short alternative search queries that could help retrieve relevant passages for the following question. Keep each on a new line, no numbering. Question: "${query}"`,
    });
    const variants = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, n);
    const uniq = [query, ...variants].filter((v, i, arr) => arr.indexOf(v) === i);
    return uniq.slice(0, Math.max(n, 1));
  } catch {
    return [query];
  }
}

