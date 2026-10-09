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

await writeFile(resolve(dist, 'app.html'), shell);
await writeFile(
  resolve(dist, 'index.html'),
  shell.replace(marker, `<div id="root">${render()}</div>`),
);
await rm(resolve(root, 'dist-ssr'), { recursive: true, force: true });
console.log('✔ prerendered / → dist/index.html (shell for other routes: dist/app.html)');
