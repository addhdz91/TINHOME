import { describe, expect, it } from 'vitest';
import { render } from './entry-prerender';

describe('build-time prerender of the landing', () => {
  it('renders the hero, header and footer without a browser router', () => {
    const html = render();
    expect(html).toContain('Intercambia tu casa. Viaja por España sin pagar alojamiento.');
    expect(html).toContain('href="/registro"');
    expect(html).toContain('href="/ayuda"');
  });
});
