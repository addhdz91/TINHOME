const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text interpolated into e-mail HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);
}

/**
 * Accessible, text-first e-mail layout (02_UX_UI_SPEC.md §8): real text, no images,
 * `lang="es"`, one clear button that is also written as a plain link.
 */
export function layout(input: {
  title: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  footer: string;
}): string {
  const paragraphs = input.paragraphs
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`)
    .join('');
  const cta = input.cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(input.cta.url)}" style="background:#0A6CF0;color:#ffffff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(input.cta.label)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:14px;color:#5B5670">${escapeHtml(input.cta.url)}</p>`
    : '';
  // STANDARDS-EXCEPTION: e-mail clients do not support CSS variables, so brand hex values are inlined here.
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(input.title)}</title></head><body style="margin:0;background:#F7F6FB;font-family:Arial,Helvetica,sans-serif;color:#1B1830"><main style="max-width:560px;margin:0 auto;padding:32px 24px;background:#FFFFFF"><p style="margin:0 0 24px;font-weight:800;font-size:20px;color:#6440CB">TinHome</p><h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(input.title)}</h1>${paragraphs}${cta}<hr style="border:none;border-top:1px solid #E4E1EE;margin:24px 0"><p style="margin:0;font-size:13px;color:#5B5670">${escapeHtml(input.footer)}</p></main></body></html>`;
}
