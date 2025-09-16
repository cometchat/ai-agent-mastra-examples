import { openai } from '@ai-sdk/openai';
import { embedMany } from 'ai';

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const model = openai.embedding('text-embedding-3-small');
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings as number[][];
}
