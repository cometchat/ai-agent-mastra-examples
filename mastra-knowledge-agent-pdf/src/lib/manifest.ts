import fs from 'fs';
import path from 'path';
import { resolveDataPath } from './paths';

export interface DocumentEntry {
  docId: string;
  filename: string;
  originalName: string;
  pages: number;
  chunks: number;
  namespace?: string;
  createdAt: string;
  updatedAt: string;
  meta?: Record<string, any>;
}

const MANIFEST_PATH = resolveDataPath('manifest.json');

export function loadManifest(): DocumentEntry[] {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as DocumentEntry[];
  } catch (e) {
    console.warn('Failed to read manifest', e);
    return [];
  }
}

export function saveManifest(entries: DocumentEntry[]) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2));
}

export function upsertDocument(entry: DocumentEntry) {
  const manifest = loadManifest();
  const idx = manifest.findIndex(e => e.docId === entry.docId);
  if (idx >= 0) {
    manifest[idx] = { ...manifest[idx], ...entry, updatedAt: new Date().toISOString() };
  } else {
    manifest.push(entry);
  }
  saveManifest(manifest);
}

export function deleteDocument(docId: string) {
  const manifest = loadManifest().filter(e => e.docId !== docId);
  saveManifest(manifest);
}

export function getDocument(docId: string) {
  return loadManifest().find(e => e.docId === docId);
}
