import express from 'express';
import multer from 'multer';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

import { getSingleDataDir, resolveSingleDataPath } from './lib/paths';
import { singleVectorStore } from './lib/store';
import { loadSingleState, saveSingleState } from './lib/state';
import { extractPdfChunks } from '../src/lib/pdf';
import { getEmbeddings } from '../src/lib/embeddings';
import { retrieveSingle } from './lib/retrieve';

const app = express();
const MAX_FILE_MB = Number(process.env.SINGLE_MAX_PDF_MB || 25);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_MB * 1024 * 1024 } });

// Ensure data dir exists and serve static UI
fs.mkdirSync(getSingleDataDir(), { recursive: true });
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : undefined }));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));
app.use(express.static('single/docs'));

// Helpers
function currentPdfPath() { return resolveSingleDataPath('current.pdf'); }

app.get('/status', (_req, res) => {
  const state = loadSingleState();
  const hasPdf = !!(state && fs.existsSync(currentPdfPath()));
  res.json({ ready: hasPdf, state: state || null });
});

app.get('/file', (_req, res) => {
  const state = loadSingleState();
  if (!state || !fs.existsSync(currentPdfPath())) return res.status(404).json({ error: 'No PDF uploaded' });
  res.setHeader('Content-Type', 'application/pdf');
  fs.createReadStream(currentPdfPath()).pipe(res);
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const isPdfMime = typeof req.file.mimetype === 'string' && /pdf$/i.test(req.file.mimetype);
    const isPdfName = typeof req.file.originalname === 'string' && req.file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !isPdfName) return res.status(400).json({ error: 'File must be a PDF' });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' });
    }

    // Replace any existing single PDF state and vectors
    const prev = loadSingleState();
    if (prev) {
      try { (singleVectorStore as any).deleteByDocIds([prev.docId]); } catch {}
    }

    const docId = 'single-' + Date.now().toString(36);
    const chunks = await extractPdfChunks(req.file.buffer);
    const embeddings = await getEmbeddings(chunks.map(c => c.text));
    const now = new Date().toISOString();
    const namespace = 'pdf';
    const records = chunks.map((c, i) => ({
      id: `${docId}:${c.id}`,
      docId,
      namespace,
      text: c.text,
      embedding: embeddings[i],
      meta: { page: c.page, uploadedAt: now, fileOriginalName: req.file.originalname },
    }));
    singleVectorStore.upsert(records as any);

    // Persist the PDF file as current.pdf
    fs.writeFileSync(currentPdfPath(), req.file.buffer);

    const pageCount = Array.from(new Set(chunks.map(c => c.page))).length;
    saveSingleState({
      docId,
      filename: path.basename(currentPdfPath()),
      originalName: req.file.originalname,
      pages: pageCount,
      chunks: records.length,
      createdAt: now,
    });
    res.json({ message: 'PDF processed', docId, pages: pageCount, chunks: records.length });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to process PDF' });
  }
});

app.post('/ask', async (req, res) => {
  try {
    const { question, topK = 5, hybridAlpha = 0.7, multiQuery = true, qVariants = 3, maxContextChars = 4000 } = req.body || {};
    if (!question) return res.status(400).json({ error: 'Missing question' });
    const state = loadSingleState();
    if (!state) return res.status(400).json({ error: 'No PDF uploaded yet' });
    const retrieved = await retrieveSingle({
      query: question,
      docId: state.docId,
      topK,
      hybridAlpha,
      multiQuery,
      qVariants,
      maxContextChars,
    });
    const system = 'You are a helpful assistant. Use ONLY the provided context. If unsure, say you do not know.';
    const user = `Context:\n${retrieved.context}\n\nQuestion: ${question}`;
    const { text } = await (await import('ai')).generateText({ model: (await import('@ai-sdk/openai')).openai('gpt-4o-mini'), prompt: `${system}\n\n${user}` });
    res.json({ answer: text, sources: retrieved.sources, context: retrieved.context });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to answer question' });
  }
});

const PORT = process.env.SINGLE_PORT || 3030;
app.listen(PORT, () => {
  console.log(`Single-PDF server listening at http://localhost:${PORT}`);
});

