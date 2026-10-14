import { describe, expect, it, vi } from 'vitest';
import { escapeHtml } from './html.js';
import { consoleEmailProvider, httpEmailProvider, resolveEmailProvider } from './providers.js';
import { renderEmail } from './templates/index.js';
import type { MailQueueItem } from './types.js';

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

describe('N-03, N-04 and N-13 (M4)', () => {
  it('render HTML and plain text with the reason or request when there is one', () => {
    const rejected = renderEmail({
      to: 'a@b.es',
      templateId: 'N-03',
      data: { result: 'REJECTED', message: 'Documento caducado <b>', url: 'https://x.test/app' },
    });
    expect(rejected.text).toContain('Motivo: Documento caducado <b>');
    expect(rejected.html).toContain('Documento caducado &lt;b&gt;');
    const founder = renderEmail({
      to: 'a@b.es',
      templateId: 'N-04',
      data: { months: 12, cityName: 'Madrid', url: 'https://x.test/app' },
    });
    expect(founder.text).toContain('12 meses de Premium');
    const referral = renderEmail({
      to: 'a@b.es',
      templateId: 'N-13',
      data: { days: 30, role: 'INVITER', url: 'https://x.test/app' },
    });
    expect(referral.subject).toBe('Tienes 30 días de Premium');
    const matched = renderEmail({
      to: 'a@b.es',
      templateId: 'N-07',
      data: {
        otherName: 'Javier S.',
        otherCity: 'Valencia',
        chatUrl: 'https://x.test/app/chats/1',
      },
    });
    expect(matched.subject).toBe('¡Tienes un match con Javier S.!');
    expect(matched.text).toContain('nunca envíes dinero');
    expect(referral.text).toContain('La persona que invitaste');
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

describe('M8 templates (N-06, N-08…N-11, N-20, N-21)', () => {
  const items: MailQueueItem[] = [
    { to: 'a@b.es', templateId: 'N-06', data: { count: 3, url: 'https://t.es/app/me-gusta' } },
    ...(['PROPOSED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'EXPIRED'] as const).map(
      (kind): MailQueueItem => ({
        to: 'a@b.es',
        templateId: 'N-08',
        data: {
          kind,
          otherName: 'Javier S.',
          dates: 'del 20 al 28 de marzo',
          url: 'https://t.es/x',
        },
      }),
    ),
    {
      to: 'a@b.es',
      templateId: 'N-09',
      data: { otherName: 'Javier S.', dates: 'd', url: 'https://t.es/x' },
    },
    {
      to: 'a@b.es',
      templateId: 'N-10',
      data: { otherName: 'Javier S.', deadline: '11 de abril', url: 'https://t.es/x' },
    },
    { to: 'a@b.es', templateId: 'N-11', data: { otherName: 'Javier S.', url: 'https://t.es/x' } },
    {
      to: 'a@b.es',
      templateId: 'N-20',
      data: { otherName: 'Javier S.', count: 2, url: 'https://t.es/x' },
    },
    { to: 'a@b.es', templateId: 'N-21', data: { otherName: 'Javier S.', url: 'https://t.es/x' } },
  ];

  it('every e-mail has a subject, HTML and a plain-text version with its link', () => {
    for (const item of items) {
      const email = renderEmail(item);
      expect(email.subject.length).toBeGreaterThan(5);
      expect(email.html).toContain('lang="es"');
      expect(email.text).toContain('https://t.es/');
      expect(`${email.subject} ${email.text}`).not.toMatch(
        /alquil|precio por noche|tinder|seguro/i,
      );
    }
  });
});

describe('HttpEmailProvider (03 §11)', () => {
  it('posts the rendered e-mail with a bearer key and fails on non-2xx answers', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 202 }));
    const provider = httpEmailProvider({
      url: 'https://mail.example.eu/send',
      apiKey: 'k',
      from: 'TinHome <hola@tinhome.es>',
      fetchImpl,
    });
    const email = { subject: 'S', html: '<p>h</p>', text: 't' };
    await provider.send({ to: 'a@b.es', email });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://mail.example.eu/send');
    expect(init.headers).toMatchObject({ authorization: 'Bearer k' });
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'TinHome <hola@tinhome.es>',
      to: 'a@b.es',
      subject: 'S',
      html: '<p>h</p>',
      text: 't',
    });
    fetchImpl.mockResolvedValueOnce(new Response('quota', { status: 429 }));
    await expect(provider.send({ to: 'a@b.es', email })).rejects.toThrow('429');
  });

  it('is chosen with EMAIL_PROVIDER=http and needs its configuration', () => {
    vi.stubEnv('EMAIL_PROVIDER', 'http');
    vi.stubEnv('EMAIL_API_URL', '');
    expect(() => resolveEmailProvider()).toThrow('EMAIL_API_URL');
    vi.stubEnv('EMAIL_API_URL', 'https://mail.example.eu/send');
    vi.stubEnv('EMAIL_API_KEY', 'k');
    vi.stubEnv('EMAIL_FROM', 'hola@tinhome.es');
    expect(resolveEmailProvider().name).toBe('http');
    vi.unstubAllEnvs();
  });
});
