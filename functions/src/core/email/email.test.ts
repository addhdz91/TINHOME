import { describe, expect, it, vi } from 'vitest';
import { escapeHtml } from './html.js';
import { consoleEmailProvider, resolveEmailProvider } from './providers.js';
import { renderEmail } from './templates/index.js';

const data = {
  cityName: 'Málaga <script>',
  confirmUrl: 'http://localhost:5173/lista-espera/confirmar?token=abc',
  expiresInDays: 7,
};

describe('N-19 waitlist confirmation', () => {
  it('has subject, escaped HTML and a plain-text version with the link', () => {
    const email = renderEmail({ to: 'a@b.es', templateId: 'N-19', data });
    expect(email.subject).toContain('lista de espera');
    expect(email.html).toContain('lang="es"');
    expect(email.html).toContain('Málaga &lt;script&gt;');
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain(data.confirmUrl);
    expect(email.text).not.toMatch(/alquil|gratis/i);
  });

  it('escapes HTML entities', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
  });
});

describe('N-02 and N-27', () => {
  it('render subject, HTML and text without personal data beyond the first name', () => {
    const welcomeMail = renderEmail({
      to: 'a@b.es',
      templateId: 'N-02',
      data: { firstName: 'Laura', onboardingUrl: 'http://x/app' },
    });
    expect(welcomeMail.subject).toContain('Laura');
    expect(welcomeMail.text).toContain('http://x/app');
    const securityMail = renderEmail({
      to: 'a@b.es',
      templateId: 'N-27',
      data: {
        event: 'SIGNED_OUT_EVERYWHERE',
        when: '1 de marzo de 2027, 10:00',
        helpUrl: 'http://x/ayuda',
      },
    });
    expect(securityMail.text).toContain('todos los dispositivos');
    expect(securityMail.html).not.toContain('a@b.es');
  });
});

describe('email providers', () => {
  it('uses the console provider only inside the emulator', async () => {
    vi.stubEnv('FUNCTIONS_EMULATOR', 'true');
    vi.stubEnv('EMAIL_PROVIDER', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolveEmailProvider().name).toBe('console');
    await consoleEmailProvider.send({
      to: 'a@b.es',
      email: renderEmail({ to: 'a@b.es', templateId: 'N-19', data }),
    });
    expect(warn).toHaveBeenCalledOnce();

    vi.stubEnv('FUNCTIONS_EMULATOR', 'false');
    await expect(
      consoleEmailProvider.send({
        to: 'a@b.es',
        email: renderEmail({ to: 'a@b.es', templateId: 'N-19', data }),
      }),
    ).rejects.toThrow();
    vi.stubEnv('EMAIL_PROVIDER', 'smtp');
    expect(() => resolveEmailProvider()).toThrow(/No e-mail provider/);
    vi.unstubAllEnvs();
    warn.mockRestore();
  });
});
