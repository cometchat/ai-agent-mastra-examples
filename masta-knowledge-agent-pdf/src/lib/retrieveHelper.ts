import { getEmbeddings } from './embeddings';
import { pdfVectorStore } from './pdfStore';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface RetrieveParams {
  query: string;
  docIds?: string[];
  topK?: number;
  hybridAlpha?: number;
  multiQuery?: boolean;
  qVariants?: number;
  maxContextChars?: number;
  debug?: boolean;
}

export async function retrieve({ query, docIds, topK = 5, hybridAlpha = 0.7, multiQuery = true, qVariants = 3, maxContextChars = 4000, debug = true }: RetrieveParams) {
  const t0 = Date.now();
  const queries = await expandQueries(query, multiQuery ? qVariants : 1);
  const allResults: any[] = [];
  for (const q of queries) {
    const embedding = (await getEmbeddings([q]))[0];
    const results = (pdfVectorStore as any).searchHybrid(embedding, {
      query: q,
      docIds: docIds && docIds.length ? docIds : undefined,
      topK,
      hybridAlpha,
      namespace: 'pdf',
    });
    allResults.push(...results);
  }
  // Deduplicate by chunk id, keep the best scored instance
  const byId = new Map<string, any>();
  for (const r of allResults) {
    const prev = byId.get(r.id);
    if (!prev || r.score > prev.score) byId.set(r.id, r);
  }
  // Re-rank by score and take topK
  const ranked = Array.from(byId.values()).sort((a, b) => b.score - a.score).slice(0, topK);

  // Stitch context with a soft character cap
  let used = 0;
  const stitched: string[] = [];
  for (const r of ranked) {
    const line = `[${r.docId} ${r.id.split(':').pop()} p${r.meta?.page}] ${r.text}`;
    if (used + line.length > maxContextChars) break;
    stitched.push(line);
    used += line.length + 1;
  }
  const context = stitched.join('\n');
  const sources = ranked.map((r: any) => ({ id: r.id, docId: r.docId, page: r.meta?.page ?? null, score: r.score }));
  const tookMs = Date.now() - t0;
  let storeInfo: any;
  try { storeInfo = (pdfVectorStore as any).info?.(); } catch {}
  if (debug) {
    return {
      context,
      sources,
      debug: {
        queries,
        params: { docIds, topK, hybridAlpha, multiQuery, qVariants, maxContextChars },
        resultCount: ranked.length,
        tookMs,
        raw: ranked.map((r: any) => ({ id: r.id, docId: r.docId, page: r.meta?.page ?? null, score: r.score, semantic: r.semantic, lexical: r.lexical })),
        store: storeInfo,
      },
    } as any;
  }
  return { context, sources };
}

async function expandQueries(query: string, n: number) {
  if (n <= 1) return [query];
  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.2,
      maxTokens: 120,
      prompt: `Generate ${n} short alternative search queries that could help retrieve relevant passages for the following question. Keep each on a new line, no numbering or punctuation beyond the query itself. Question: "${query}"`,
    });
    const variants = text
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, n);
    // Ensure the original query is included and first
    const uniq = [query, ...variants].filter((v, i, arr) => arr.indexOf(v) === i);
    return uniq.slice(0, Math.max(n, 1));
  } catch {
    return [query];
  }
}
