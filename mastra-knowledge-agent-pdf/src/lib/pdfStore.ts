import { SimpleVectorStore } from './vectorStore';
import { resolveDataPath } from './paths';

// Singleton vector store for PDF chunks. Persisted to .data/
// Centralizing the instance here avoids circular dependencies between
// agents and helper utilities that both need access to the store.
export const pdfVectorStore = new SimpleVectorStore(resolveDataPath('pdf-vectors.json'));
