import fs from 'fs';
import path from 'path';

export interface VectorRecord {
  id: string;              // unique chunk id (docId:chunkId)
  docId: string;           // document identifier
  namespace?: string;      // optional namespace / collection
  text: string;            // original chunk text
  embedding: number[];     // vector embedding
  meta?: Record<string, any>; // misc metadata (page, etc.)
  _tokenFreq?: Record<string, number>; // cached token frequencies for BM25
}

interface SearchOptions {
  topK?: number;
  namespace?: string;
  docIds?: string[]; // restrict to specific documents
  hybridAlpha?: number; // 0..1 weight for semantic (default .7)
  query?: string; // raw query for lexical scoring
}

export class SimpleVectorStore {
  private vectors: VectorRecord[] = [];
  private inverseDocFreq: Record<string, number> = {}; // cached IDF values
  private dirtyBM25 = true;
  private lastLoadedMtimeMs: number | null = null;

  constructor(private persistPath?: string) {
    if (persistPath && fs.existsSync(persistPath)) {
      this.reloadFromDiskSafe();
    }
  }

  info() {
    try {
      const docs = new Map<string, number>();
      for (const v of this.vectors) docs.set(v.docId, (docs.get(v.docId) || 0) + 1);
      return {
        path: this.persistPath,
        records: this.vectors.length,
        documents: Array.from(docs.entries()).map(([docId, count]) => ({ docId, chunks: count })),
      };
    } catch {
      return { path: this.persistPath, records: this.vectors.length } as any;
    }
  }

  upsert(records: Omit<VectorRecord,'_tokenFreq'>[]) {
    for (const r of records) {
      const rec: VectorRecord = { ...r, _tokenFreq: this.tokenFreq(r.text) };
      const idx = this.vectors.findIndex(v => v.id === rec.id);
      if (idx >= 0) this.vectors[idx] = rec; else this.vectors.push(rec);
    }
    this.dirtyBM25 = true;
    this.persist();
  }

  deleteByDocIds(docIds: string[]) {
    const set = new Set(docIds);
    this.vectors = this.vectors.filter(v => !set.has(v.docId));
    this.dirtyBM25 = true;
    this.persist();
  }

  clearNamespace(namespace?: string) {
    if (!namespace) {
      this.vectors = [];
    } else {
      this.vectors = this.vectors.filter(v => v.namespace !== namespace);
    }
    this.dirtyBM25 = true;
    this.persist();
  }

  listDocuments(namespace?: string) {
    const docs = new Map<string, { docId: string; namespace?: string; chunks: number }>();
    for (const v of this.vectors) {
      if (namespace && v.namespace !== namespace) continue;
      const entry = docs.get(v.docId) || { docId: v.docId, namespace: v.namespace, chunks: 0 };
      entry.chunks++;
      docs.set(v.docId, entry);
    }
    return Array.from(docs.values());
  }

  private ensureBM25() {
    if (!this.dirtyBM25) return;
    const docCount = this.vectors.length || 1;
    const df: Record<string, number> = {};
    for (const v of this.vectors) {
      const seen = new Set<string>();
      for (const token of Object.keys(v._tokenFreq || {})) {
        if (!seen.has(token)) {
          df[token] = (df[token] || 0) + 1;
          seen.add(token);
        }
      }
    }
    this.inverseDocFreq = {};
    for (const [t, count] of Object.entries(df)) {
      this.inverseDocFreq[t] = Math.log(1 + (docCount - count + 0.5) / (count + 0.5));
    }
    this.dirtyBM25 = false;
  }

  private bm25Score(queryTokens: string[], rec: VectorRecord) {
    this.ensureBM25();
    const freq = rec._tokenFreq || {};
    // average doc length
    const avgdl = this.vectors.reduce((a, v) => a + this.length(v), 0) / (this.vectors.length || 1);
    const k1 = 1.2;
    const b = 0.75;
    const dl = this.length(rec);
    let score = 0;
    for (const token of queryTokens) {
      const f = freq[token] || 0;
      if (!f) continue;
      const idf = this.inverseDocFreq[token] || 0;
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (dl / avgdl))));
    }
    return score;
  }

  private length(rec: VectorRecord) {
    return Object.values(rec._tokenFreq || {}).reduce((a, b) => a + b, 0);
  }

  searchHybrid(queryEmbedding: number[], opts: SearchOptions = {}) {
    // If another process updated the store on disk, reload it so this process has fresh vectors
    this.maybeReloadFromDisk();
    const { topK = 5, namespace, docIds, hybridAlpha = 0.7, query = '' } = opts;
    const queryTokens = this.tokenize(query);
    const filtered = this.vectors.filter(v => {
      if (namespace && v.namespace !== namespace) return false;
      if (docIds && docIds.length && !docIds.includes(v.docId)) return false;
      return true;
    });

    const scored = filtered.map(v => {
      const semantic = cosineSimilarity(queryEmbedding, v.embedding);
      const lexical = query ? this.bm25Score(queryTokens, v) : 0;
      const score = hybridAlpha * semantic + (1 - hybridAlpha) * normalizeBM25(lexical);
      return { ...v, score, semantic, lexical };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  private tokenize(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  private tokenFreq(text: string) {
    const freq: Record<string, number> = {};
    for (const t of this.tokenize(text)) freq[t] = (freq[t] || 0) + 1;
    return freq;
  }

  private persist() {
    if (!this.persistPath) return;
    try {
      fs.mkdirSync(path.dirname(this.persistPath), { recursive: true });
      fs.writeFileSync(this.persistPath, JSON.stringify(this.vectors, null, 2));
      // update mtime cache
      try {
        const st = fs.statSync(this.persistPath);
        this.lastLoadedMtimeMs = st.mtimeMs;
      } catch {}
    } catch (e) {
      console.warn('Failed to persist vector store:', e);
    }
  }

  private reloadFromDiskSafe() {
    if (!this.persistPath) return;
    try {
      const raw = fs.readFileSync(this.persistPath, 'utf-8');
      const parsed: VectorRecord[] = JSON.parse(raw);
      this.vectors = parsed.map(v => ({ ...v, _tokenFreq: v._tokenFreq || this.tokenFreq(v.text) }));
      const st = fs.statSync(this.persistPath);
      this.lastLoadedMtimeMs = st.mtimeMs;
      this.dirtyBM25 = true;
    } catch (e) {
      console.warn('Failed to load vector store:', e);
    }
  }

  private maybeReloadFromDisk() {
    if (!this.persistPath) return;
    try {
      const st = fs.statSync(this.persistPath);
      if (!this.lastLoadedMtimeMs || st.mtimeMs > this.lastLoadedMtimeMs) {
        this.reloadFromDiskSafe();
      }
    } catch {
      // ignore if file missing
    }
  }
}

function cosineSimilarity(a: number[], b: number[]) {
  const dot = a.reduce((acc, val, i) => acc + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(b.reduce((acc, val) => acc + val * val, 0));
  return dot / (normA * normB + 1e-8);
}

function normalizeBM25(score: number) {
  // Simple squashing; could store max, but for demo apply logistic
  return 1 / (1 + Math.exp(-score));
}
