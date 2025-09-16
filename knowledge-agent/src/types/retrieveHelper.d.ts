declare module './lib/retrieveHelper.js' {
  interface RetrieveParams {
    query: string;
    docIds?: string[];
    topK?: number;
    hybridAlpha?: number;
    multiQuery?: boolean;
    qVariants?: number;
    maxContextChars?: number;
  }
  export function retrieve(params: RetrieveParams): Promise<{ context: string; sources: Array<{ id: string; docId: string; page: number | null; score: number }>; }>;
}
