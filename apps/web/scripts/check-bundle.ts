/**
 * 09 §4 — initial bundle of the app (entry + preloads + CSS of `app.html`, no admin) under
 * 250 KB gzip, and no lazy chunk over 200 KB gzip. Run after `vite build`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = join(import.meta.dirname, '..', 'dist');
const INITIAL_BUDGET = 250 * 1024;
const CHUNK_BUDGET = 200 * 1024;

const gz = (file: string) => gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length;
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

const html = readFileSync(join(DIST, 'app.html'), 'utf8');
const initial = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map(
  (m) => m[1] ?? '',
);
const initialBytes = initial.reduce((sum, file) => sum + gz(file), 0);
const oversized = readdirSync(join(DIST, 'assets'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({ file, bytes: gz(join('assets', file)) }))
  .filter(({ bytes }) => bytes > CHUNK_BUDGET);

console.log(`Initial bundle: ${kb(initialBytes)} gzip (budget ${kb(INITIAL_BUDGET)})`);
let failed = false;
if (initialBytes > INITIAL_BUDGET) {
  console.error('✖ Initial bundle over budget');
  failed = true;
}
for (const { file, bytes } of oversized) {
  console.error(`✖ ${file}: ${kb(bytes)} gzip (chunk budget ${kb(CHUNK_BUDGET)})`);
  failed = true;
}
if (failed) process.exit(1);
console.log('✔ Bundle budgets met');
