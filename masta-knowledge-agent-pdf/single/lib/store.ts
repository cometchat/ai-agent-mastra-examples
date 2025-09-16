import { SimpleVectorStore } from '../../src/lib/vectorStore';
import { resolveSingleDataPath } from './paths';

// A dedicated vector store for the single-PDF experience
export const singleVectorStore = new SimpleVectorStore(resolveSingleDataPath('vectors.json'));

