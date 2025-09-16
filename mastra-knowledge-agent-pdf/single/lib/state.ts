import fs from 'fs';
import path from 'path';
import { resolveSingleDataPath } from './paths';

export interface SingleDocState {
  docId: string;
  filename: string; // stored filename (in .data-single)
  originalName: string;
  pages: number;
  chunks: number;
  createdAt: string;
}

const STATE_PATH = resolveSingleDataPath('state.json');

export function loadSingleState(): SingleDocState | null {
  if (!fs.existsSync(STATE_PATH)) return null;
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf-8');
    return JSON.parse(raw) as SingleDocState;
  } catch {
    return null;
  }
}

export function saveSingleState(state: SingleDocState) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function clearSingleState() {
  try { if (fs.existsSync(STATE_PATH)) fs.unlinkSync(STATE_PATH); } catch {}
}

