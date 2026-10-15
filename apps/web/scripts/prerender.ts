/**
 * Injects the prerendered landing into `dist/index.html` and keeps an unrendered copy as
 * `dist/app.html`, the SPA shell that Firebase Hosting serves for every other route
 * (firebase.json rewrites). Run after `vite build` and the SSR build of entry-prerender.
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const ssrEntry = resolve(root, 'dist-ssr/entry-prerender.js');

const { render } = (await import(pathToFileURL(ssrEntry).href)) as { render: () => string };
const shell = await readFile(resolve(dist, 'index.html'), 'utf8');
const marker = '<div id="root"></div>';
if (!shell.includes(marker)) throw new Error('index.html has no empty #root');

// NFR-02 — every route served by app.html goes through the session layout (auth gate, Auth
// SDK, callables). Preloading that chunk and its static imports removes one network round of
// the cold start; the landing (index.html) does not need them.
interface ManifestChunk {
  file: string;
  imports?: string[];
}
const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8')) as Record<
  string,
  ManifestChunk
>;
const SESSION_ENTRY = 'src/app/auth/SessionLayout.tsx';
const preload = new Set<string>();
const visit = (key: string) => {
  const chunk = manifest[key];
  if (!chunk || preload.has(chunk.file)) return;
  preload.add(chunk.file);
  for (const child of chunk.imports ?? []) visit(child);
};
visit(SESSION_ENTRY);
if (preload.size === 0) throw new Error(`manifest has no ${SESSION_ENTRY}`);
const links = [...preload]
  .filter((file) => !shell.includes(`/${file}"`))
  .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`)
  .join('');
await writeFile(resolve(dist, 'app.html'), shell.replace('</head>', `${links}</head>`));

// NFR-02 — the landing's LCP is its <h1>: inline the stylesheet so the first paint only needs
// the HTML (on 4G it otherwise waits behind the preloaded JS). CSP allows inline styles.
const stylesheet = /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/.exec(shell);
let landing = shell.replace(marker, `<div id="root">${render()}</div>`);
if (stylesheet?.[1]) {
  const css = await readFile(resolve(dist, stylesheet[1].slice(1)), 'utf8');
  landing = landing.replace(stylesheet[0], `<style>${css}</style>`);
}
await writeFile(resolve(dist, 'index.html'), landing);
await rm(resolve(root, 'dist-ssr'), { recursive: true, force: true });
console.log('✔ prerendered / → dist/index.html (shell for other routes: dist/app.html)');
