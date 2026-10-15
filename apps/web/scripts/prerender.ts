/**
 * Build-time HTML (run after `vite build` and the SSR build of entry-prerender):
 * - `dist/index.html`: the prerendered landing (hydrated by main.tsx);
 * - `dist/app.html`: the SPA shell Firebase Hosting serves for every other route;
 * - `dist/entrar.html` and `dist/registro.html`: the shell plus the prerendered signed-out page,
 *   hydrated by main.tsx once the session is known (firebase.json rewrites).
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const ssrEntry = resolve(root, 'dist-ssr/entry-prerender.js');

const { render, renderAuthPage, AUTH_PAGES } = (await import(pathToFileURL(ssrEntry).href)) as {
  render: () => string;
  renderAuthPage: (path: string) => string;
  AUTH_PAGES: readonly string[];
};
const shell = await readFile(resolve(dist, 'index.html'), 'utf8');
const marker = '<div id="root"></div>';
if (!shell.includes(marker)) throw new Error('index.html has no empty #root');

interface ManifestChunk {
  file: string;
  imports?: string[];
}
const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8')) as Record<
  string,
  ManifestChunk
>;

/** `<link rel="modulepreload">` for these modules and their static imports not yet in `html`. */
function preloadLinks(html: string, entries: string[]): string {
  const files = new Set<string>();
  const visit = (key: string) => {
    const chunk = manifest[key];
    if (!chunk || files.has(chunk.file)) return;
    files.add(chunk.file);
    for (const child of chunk.imports ?? []) visit(child);
  };
  for (const entry of entries) {
    if (!manifest[entry]) throw new Error(`manifest has no ${entry}`);
    visit(entry);
  }
  return [...files]
    .filter((file) => !html.includes(`/${file}"`))
    .map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`)
    .join('');
}

// NFR-02 — the first paint should only need the HTML: inline the stylesheet (CSP allows
// inline styles); on 4G it otherwise waits behind the preloaded JS.
const stylesheet = /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/.exec(shell);
const css = stylesheet?.[1] ? await readFile(resolve(dist, stylesheet[1].slice(1)), 'utf8') : null;
const inlineCss = (html: string) =>
  stylesheet && css !== null ? html.replace(stylesheet[0], `<style>${css}</style>`) : html;

// Every route served by app.html goes through the session layout (auth gate, Auth SDK, getMe):
// preloading it and its static imports removes one network round of the cold start.
const SESSION = 'src/app/auth/SessionLayout.tsx';
const appShell = shell.replace('</head>', `${preloadLinks(shell, [SESSION])}</head>`);
await writeFile(resolve(dist, 'app.html'), appShell);

await writeFile(
  resolve(dist, 'index.html'),
  inlineCss(shell.replace(marker, `<div id="root">${render()}</div>`)),
);

const PAGE_MODULES: Record<string, string> = {
  '/entrar': 'src/features/auth/pages/SignInPage.tsx',
  '/registro': 'src/features/auth/pages/RegisterPage.tsx',
};
for (const path of AUTH_PAGES) {
  const page = PAGE_MODULES[path];
  if (!page) throw new Error(`no page module for ${path}`);
  // Same markup the client renders first, so main.tsx hydrates it (like the landing).
  const markup = renderAuthPage(path);
  // A loading state here would mean the client tree changed: the page must render at once.
  if (!markup.includes('<h1')) throw new Error(`prerender of ${path} has no <h1>`);
  const title = /<title>[^<]*<\/title>/.exec(markup);
  let html = appShell.replace(
    '</head>',
    `${preloadLinks(appShell, ['src/app/layouts/AuthPagesLayout.tsx', page])}</head>`,
  );
  if (title) html = html.replace(/<title>[^<]*<\/title>/, title[0]);
  // `inert` until hydrated: what is visible cannot be used before React takes it over.
  html = html.replace(marker, `<div id="root" data-prerender inert>${markup}</div>`);
  await writeFile(resolve(dist, `${path.slice(1)}.html`), inlineCss(html));
}

await rm(resolve(root, 'dist-ssr'), { recursive: true, force: true });
console.log(
  `✔ prerendered / → index.html, ${AUTH_PAGES.join(', ')} → hydratable pages; other routes → app.html`,
);
