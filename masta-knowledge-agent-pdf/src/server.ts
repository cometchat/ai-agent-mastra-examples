import express, { Request } from 'express';
import multer from 'multer';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { resolveDataPath, getDataDir } from './lib/paths';
import { mastra } from './mastra';
import { retrieve } from './lib/retrieveHelper.js';
import { extractPdfChunks } from './lib/pdf';
import { getEmbeddings } from './lib/embeddings';
import { pdfVectorStore } from './lib/pdfStore';
import { nanoid } from 'nanoid';
import { upsertDocument, loadManifest, deleteDocument } from './lib/manifest';

import dotenv from 'dotenv';
dotenv.config();

const MAX_FILE_MB = Number(process.env.MAX_PDF_MB || 25);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_MB * 1024 * 1024 },
});
const app = express();

const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors({ origin: allowedOrigin ? [allowedOrigin] : undefined }));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));
app.use(express.json());
// Serve static frontend (docs/) so the UI and API share the same origin
app.use(express.static('docs'));

// Extend Express Request type for multer file (simplified)
interface FileRequest extends Request { file?: any }

// Ensure data dir exists
fs.mkdirSync(getDataDir(), { recursive: true });

app.post('/api/upload', upload.single('file'), async (req: FileRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const isPdfMime = typeof req.file.mimetype === 'string' && /pdf$/i.test(req.file.mimetype);
    const isPdfName = typeof req.file.originalname === 'string' && req.file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdfMime && !isPdfName) return res.status(400).json({ error: 'File must be a PDF' });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' });
    }
    const namespace = 'pdf'; // single namespace for now
    const docId = nanoid(10);
    const originalName = req.file.originalname;
    const chunks = await extractPdfChunks(req.file.buffer);
    const embeddings = await getEmbeddings(chunks.map(c => c.text));
    const now = new Date().toISOString();
    const records = chunks.map((c, i) => ({
      id: `${docId}:${c.id}`,
      docId,
      namespace,
      text: c.text,
      embedding: embeddings[i],
      meta: { page: c.page, uploadedAt: now, fileOriginalName: originalName },
    }));
    pdfVectorStore.upsert(records as any);

    const storedFilePath = resolveDataPath(`doc-${docId}.pdf`);
    fs.writeFileSync(storedFilePath, req.file.buffer);

    const pageCount = Array.from(new Set(chunks.map(c => c.page))).length;
    upsertDocument({
      docId,
      filename: path.basename(storedFilePath),
      originalName,
      pages: pageCount,
      chunks: records.length,
      namespace,
      createdAt: now,
      updatedAt: now,
      meta: {},
    });

    res.json({
      message: 'PDF processed',
      docId,
      originalName,
      pages: pageCount,
      chunks: records.length,
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to process PDF' });
  }
});

app.get('/api/documents', (_req, res) => {
  try {
    return res.json({ documents: loadManifest() });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to list documents' });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  try {
    const docId = req.params.id;
    // Remove vector chunks for doc
    (pdfVectorStore as any).deleteByDocIds([docId]);
    deleteDocument(docId);
    // remove stored file if exists
    const filePath = resolveDataPath(`doc-${docId}.pdf`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.json({ deleted: docId });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
});

app.get('/api/documents/:id/file', (req, res) => {
  try {
    const docId = req.params.id;
    const filePath = resolveDataPath(`doc-${docId}.pdf`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Type', 'application/pdf');
    fs.createReadStream(filePath).pipe(res);
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to stream file' });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    const { question, docIds, topK = 5, hybridAlpha = 0.7, multiQuery = true, qVariants = 3, maxContextChars = 4000 } =
      req.body as { question?: string; docIds?: string[]; topK?: number; hybridAlpha?: number; multiQuery?: boolean; qVariants?: number; maxContextChars?: number };
    if (!question) return res.status(400).json({ error: 'Missing question' });
    const wf = mastra.getWorkflow('pdfWorkflow');
    if (!wf) return res.status(500).json({ error: 'PDF workflow not registered' });
    const run = wf.createRun();
    const result = await run.start({ inputData: { question, docIds, topK, hybridAlpha, multiQuery, qVariants, maxContextChars } });
    if (result.status === 'success') return res.json(result.result);
    return res.status(500).json({ error: 'Workflow failed', details: String((result as any).error || 'unknown') });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to answer question' });
  }
});

// Deterministic retrieval + answer (explicit retrieval instead of relying on tool invocation)
app.post('/api/ask/full', async (req, res) => {
  try {
    const { question, docIds, topK = 5, hybridAlpha = 0.7, multiQuery = true, qVariants = 3, maxContextChars = 4000 } =
      req.body as { question?: string; docIds?: string[]; topK?: number; hybridAlpha?: number; multiQuery?: boolean; qVariants?: number; maxContextChars?: number };
    if (!question) return res.status(400).json({ error: 'Missing question' });
    const wf = mastra.getWorkflow('pdfWorkflow');
    if (!wf) return res.status(500).json({ error: 'PDF workflow not registered' });
    const run = wf.createRun();
    const result = await run.start({ inputData: { question, docIds, topK, hybridAlpha, multiQuery, qVariants, maxContextChars } });
    if (result.status === 'success') return res.json(result.result);
    return res.status(500).json({ error: 'Workflow failed', details: String((result as any).error || 'unknown') });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Failed to answer question' });
  }
});

// SSE streaming endpoint
app.post('/api/ask/stream', async (req, res) => {
  try {
    const { question, docIds, topK = 5, hybridAlpha = 0.7, multiQuery = true, qVariants = 3, maxContextChars = 4000 } =
      req.body as { question?: string; docIds?: string[]; topK?: number; hybridAlpha?: number; multiQuery?: boolean; qVariants?: number; maxContextChars?: number };
    if (!question) {
      res.writeHead(400, { 'Content-Type': 'text/event-stream' });
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Missing question' })}\n\n`);
      return res.end();
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    // Run the workflow for consistent retrieval + answer.
    const wf = mastra.getWorkflow('pdfWorkflow');
    if (!wf) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'PDF workflow not registered' })}\n\n`);
      return res.end();
    }
    const run = wf.createRun();
    const result = await run.start({ inputData: { question, docIds, topK, hybridAlpha, multiQuery, qVariants, maxContextChars } });
    if (result.status !== 'success') {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Workflow failed' })}\n\n`);
      return res.end();
    }
    const { answer, sources } = result.result as any;
    res.write(`event: meta\ndata: ${JSON.stringify({ sources })}\n\n`);
    // Stream the final answer as tokens to the client for a smooth UX
    const CHUNK = 24;
    for (let i = 0; i < answer.length; i += CHUNK) {
      const token = answer.slice(i, i + CHUNK);
      res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
      // yield to flush
      await new Promise(r => setTimeout(r, 5));
    }
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (e: any) {
    console.error(e);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: e.message || 'Failure' })}\n\n`);
      res.end();
    } catch {}
  }
});

// --- Single PDF specific endpoints (isolated agent) ---
app.post('/api/ask/single', async (req, res) => {
  try {
    const { question, topK = 5, hybridAlpha = 0.7, multiQuery = true, qVariants = 3, maxContextChars = 4000 } =
      req.body as { question?: string; topK?: number; hybridAlpha?: number; multiQuery?: boolean; qVariants?: number; maxContextChars?: number };
    if (!question) return res.status(400).json({ error: 'Missing question' });
    const { loadManifest } = await import('./lib/manifest');
    const manifest = loadManifest();
    if (!manifest.length) return res.status(400).json({ error: 'No PDF uploaded yet' });
    manifest.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestDocId = manifest[0].docId;
    const agent = mastra.getAgent('singlePdfAgent');
    if (!agent) return res.status(500).json({ error: 'Single PDF agent not registered' });
    const { retrieve } = await import('./lib/retrieveHelper.js');
    const retrieved = await retrieve({ query: question, docIds: [latestDocId], topK, hybridAlpha, multiQuery, qVariants, maxContextChars } as any);
    const system = 'You are a helpful assistant restricted to the most recently uploaded single PDF context. If unsure, say you do not know.';
    const user = `Context (single PDF):\n${retrieved.context}\n\nQuestion: ${question}`;
    const stream = await agent.stream([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    let answer = '';
    for await (const t of stream.textStream) answer += t;
    return res.json({ answer, sources: retrieved.sources, context: retrieved.context, docId: latestDocId });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Failed to answer single PDF question' });
  }
});

app.post('/api/ask/single/stream', async (req, res) => {
  try {
    const { question, topK = 5, hybridAlpha = 0.7, multiQuery = true, qVariants = 3, maxContextChars = 4000 } =
      req.body as { question?: string; topK?: number; hybridAlpha?: number; multiQuery?: boolean; qVariants?: number; maxContextChars?: number };
    if (!question) {
      res.writeHead(400, { 'Content-Type': 'text/event-stream' });
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Missing question' })}\n\n`);
      return res.end();
    }
    const { loadManifest } = await import('./lib/manifest');
    const manifest = loadManifest();
    if (!manifest.length) {
      res.writeHead(400, { 'Content-Type': 'text/event-stream' });
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'No PDF uploaded yet' })}\n\n`);
      return res.end();
    }
    manifest.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestDocId = manifest[0].docId;
    const agent = mastra.getAgent('singlePdfAgent');
    if (!agent) {
      res.writeHead(500, { 'Content-Type': 'text/event-stream' });
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Single PDF agent not registered' })}\n\n`);
      return res.end();
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const { retrieve } = await import('./lib/retrieveHelper.js');
    const retrieved = await retrieve({ query: question, docIds: [latestDocId], topK, hybridAlpha, multiQuery, qVariants, maxContextChars } as any);
    res.write(`event: meta\ndata: ${JSON.stringify({ sources: retrieved.sources, docId: latestDocId })}\n\n`);
    const system = 'You are a helpful assistant restricted to the most recently uploaded single PDF context. If unsure, say you do not know.';
    const user = `Context (single PDF):\n${retrieved.context}\n\nQuestion: ${question}`;
    const stream = await agent.stream([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    for await (const chunk of stream.textStream) {
      res.write(`event: token\ndata: ${JSON.stringify({ token: chunk })}\n\n`);
    }
    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch (e: any) {
    console.error(e);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: e.message || 'Failure' })}\n\n`);
      res.end();
    } catch {}
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
