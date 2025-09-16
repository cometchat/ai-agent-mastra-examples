import { describe, it, expect } from 'vitest';
import { SimpleVectorStore } from '../src/lib/vectorStore';

function fakeEmbedding(dim: number, seed: number) {
  const arr: number[] = [];
  for (let i = 0; i < dim; i++) {
    const val = Math.sin(seed + i) + Math.cos(seed * (i + 1));
    arr.push(val);
  }
  // normalize
  const norm = Math.sqrt(arr.reduce((a, b) => a + b * b, 0));
  return arr.map(v => v / (norm || 1));
}

describe('SimpleVectorStore hybrid search', () => {
  it('ranks relevant chunks higher with hybrid search', () => {
    const store = new SimpleVectorStore();
    // Insert docs
    store.upsert([
      { id: 'd1:c1', docId: 'd1', namespace: 'pdf', text: 'The quick brown fox jumps over the lazy dog', embedding: fakeEmbedding(8, 1) },
      { id: 'd1:c2', docId: 'd1', namespace: 'pdf', text: 'A slow green turtle rests under a warm sun', embedding: fakeEmbedding(8, 2) },
      { id: 'd2:c1', docId: 'd2', namespace: 'pdf', text: 'Quantum mechanics explores particles and waves', embedding: fakeEmbedding(8, 3) },
    ] as any);

    const query = 'fox over dog';
    const queryEmbedding = fakeEmbedding(8, 1); // similar seed to first chunk

    const results = (store as any).searchHybrid(queryEmbedding, { query, namespace: 'pdf', topK: 2, hybridAlpha: 0.6 });

    expect(results[0].id).toContain('d1:c1');
  });

  it('filters by docIds', () => {
    const store = new SimpleVectorStore();
    store.upsert([
      { id: 'a1:c1', docId: 'a1', namespace: 'pdf', text: 'alpha beta gamma', embedding: fakeEmbedding(4, 10) },
      { id: 'b2:c1', docId: 'b2', namespace: 'pdf', text: 'delta epsilon zeta', embedding: fakeEmbedding(4, 20) },
    ] as any);
    const results = (store as any).searchHybrid(fakeEmbedding(4, 10), { query: 'alpha', docIds: ['a1'], namespace: 'pdf', topK: 5 });
    expect(results.every((r: any) => r.docId === 'a1')).toBe(true);
  });
});
