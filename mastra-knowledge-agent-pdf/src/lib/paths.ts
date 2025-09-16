import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function findProjectRoot(startDir: string) {
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback to process cwd
  return process.cwd();
}

export function getDataDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = findProjectRoot(here);
  const dir = process.env.DATA_DIR || path.join(root, '.data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveDataPath(rel: string) {
  return path.join(getDataDir(), rel);
}

