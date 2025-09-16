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
  return process.cwd();
}

export function getSingleDataDir() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = findProjectRoot(here);
  const dir = process.env.SINGLE_DATA_DIR || path.join(root, '.data-single');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveSingleDataPath(rel: string) {
  return path.join(getSingleDataDir(), rel);
}

