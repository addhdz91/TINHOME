/**
 * 09 §4 — bundle budgets, run after `pnpm build`:
 * - entry bundle (entry chunk + its static imports + CSS, the same for the landing and the
 *   SPA shell): under 250 KB gzip (09 §4 «bundle inicial de la app (sin admin)»);
 * - SPA shell (`app.html`, which also preloads the session layout: auth gate, Auth SDK,
 *   `getMe`): under 300 KB gzip (10_DECISIONS §5, M10);
 * - no lazy chunk over 200 KB gzip.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = join(import.meta.dirname, '..', 'dist');
const ENTRY_BUDGET = 250 * 1024;
const SHELL_BUDGET = 300 * 1024;
const CHUNK_BUDGET = 200 * 1024;

const gz = (file: string) => gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length;
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

/** JS and CSS a page asks for before running anything else (`<head>` scripts and links). */
function headAssets(page: string): string[] {
  const head = readFileSync(join(DIST, page), 'utf8').split('</head>')[0] ?? '';
  return [...head.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1] ?? '');
}

const sum = (files: string[]) => files.reduce((total, file) => total + gz(file), 0);
// The landing inlines its CSS, so the entry is measured on app.html without the session preload.
const landing = new Set(headAssets('index.html'));
const shell = headAssets('app.html');
const entry = shell.filter((file) => landing.has(file) || file.endsWith('.css'));
const checks = [
  { name: 'Entry bundle', bytes: sum(entry), budget: ENTRY_BUDGET },
  { name: 'SPA shell (with session preload)', bytes: sum(shell), budget: SHELL_BUDGET },
];

let failed = false;
for (const { name, bytes, budget } of checks) {
  const ok = bytes <= budget;
  console.log(`${ok ? '✔' : '✖'} ${name}: ${kb(bytes)} gzip (budget ${kb(budget)})`);
  failed ||= !ok;
}
for (const file of readdirSync(join(DIST, 'assets')).filter((name) => name.endsWith('.js'))) {
  const bytes = gz(join('assets', file));
  if (bytes > CHUNK_BUDGET) {
    console.error(`✖ ${file}: ${kb(bytes)} gzip (chunk budget ${kb(CHUNK_BUDGET)})`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('✔ Bundle budgets met');
