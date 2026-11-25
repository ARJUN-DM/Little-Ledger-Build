/**
 * Copies the static app into dist/ so a host such as Vercel can serve it.
 * No bundling: the app ships the files in little-ledger/ unchanged.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(root, 'little-ledger');
const target = path.join(root, 'dist');

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });

console.log('Built dist/ from little-ledger/');
