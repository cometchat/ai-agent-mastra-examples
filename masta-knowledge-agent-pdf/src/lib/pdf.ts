// Work around pdf-parse's CJS debug entry that reads a test file when imported
// via ESM loaders. Import the library implementation directly.
// See node_modules/pdf-parse/index.js (debug block using module.parent).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - no types for deep import
import pdf from 'pdf-parse/lib/pdf-parse.js';

export interface Chunk {
  id: string;
  text: string;
  page: number;
}

export async function extractPdfChunks(buffer: Buffer, opts: { chunkSize?: number; overlap?: number } = {}): Promise<Chunk[]> {
  const { chunkSize = 800, overlap = 100 } = opts;
  const data = await pdf(buffer);
  const pages: string[] = data.text.split(/\f|\n\s*\n/g).filter((p: string) => p.trim().length > 0);
  const chunks: Chunk[] = [];
  let globalIndex = 0;
  pages.forEach((pageText: string, pageIdx: number) => {
    const clean = pageText.replace(/\s+/g, ' ').trim();
    let start = 0;
    while (start < clean.length) {
      const end = Math.min(start + chunkSize, clean.length);
      const slice = clean.slice(start, end);
      chunks.push({ id: `p${pageIdx + 1}_c${globalIndex++}`, text: slice, page: pageIdx + 1 });
      if (end === clean.length) break;
      start = end - overlap;
      if (start < 0) start = 0;
    }
  });
  return chunks;
}
