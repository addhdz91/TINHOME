import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs from apps/web.
const root = (path: string) => resolve(process.cwd(), '../..', path);

interface HostingHeaders {
  hosting: { headers: { source: string; headers: { key: string; value: string }[] }[] };
}

function csp(): string {
  const config = JSON.parse(readFileSync(root('firebase.json'), 'utf8')) as HostingHeaders;
  const all = config.hosting.headers.find((entry) => entry.source === '**');
  return all?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';
}

describe('Content-Security-Policy (M10)', () => {
  it('allows every inline script of index.html by its hash and nothing inline otherwise', () => {
    const html = readFileSync(root('apps/web/index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');
    expect(scripts.length).toBeGreaterThan(0);
    const policy = csp();
    for (const script of scripts) {
      const hash = createHash('sha256').update(script).digest('base64');
      expect(policy).toContain(`'sha256-${hash}'`);
    }
    const scriptSrc = policy.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });
});
