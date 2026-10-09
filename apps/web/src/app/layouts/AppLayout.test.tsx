import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderRoutesWithAuth } from '@/test/render';
import { authValue, fakeUser, signedIn } from '@/test/session';
import { AppLayout } from './AppLayout';

vi.mock('@/lib/callables', () => ({ acceptLegalDocs: vi.fn(async () => ({ ok: true })) }));

const probe = (name: string) => ({ path: name, element: <p>{`at ${name}`}</p> });
const routes = [
  {
    path: '/app',
    element: <AppLayout />,
    children: [probe('descubrir'), probe('onboarding/:paso')],
  },
  probe('/entrar'),
  probe('/registro'),
  probe('/verifica-email'),
];

describe('AppLayout guards (02_UX §2.3)', () => {
  it('1 · sends visitors to /entrar keeping where they wanted to go', async () => {
    renderRoutesWithAuth(
      [...routes, { path: '/entrar', element: <p>{'at entrar'}</p> }],
      '/app/descubrir?x=1',
      authValue({ status: 'signedOut' }),
    );
    expect(await screen.findByText('at /entrar')).toBeInTheDocument();
  });

  it('sends a Firebase user without profile to /registro', async () => {
    renderRoutesWithAuth(
      routes,
      '/app/descubrir',
      authValue({ status: 'needsProfile', user: fakeUser() }),
    );
    expect(await screen.findByText('at /registro')).toBeInTheDocument();
  });

  it('2 · sends unverified e-mails to /verifica-email', async () => {
    renderRoutesWithAuth(
      routes,
      '/app/descubrir',
      signedIn({ verification: { emailVerified: false, phoneVerified: false, identity: 'NONE' } }),
    );
    expect(await screen.findByText('at /verifica-email')).toBeInTheDocument();
  });

  it('3 · forces onboarding steps 2–4, but not 5–6', async () => {
    const { unmount } = renderRoutesWithAuth(
      routes,
      '/app/descubrir',
      signedIn({ onboarding: { step: 3, completed: false, percent: 33 } }),
    );
    expect(await screen.findByText('at onboarding/:paso')).toBeInTheDocument();
    unmount();
    renderRoutesWithAuth(
      routes,
      '/app/descubrir',
      signedIn({ onboarding: { step: 5, completed: false, percent: 67 } }),
    );
    expect(await screen.findByText('at descubrir')).toBeInTheDocument();
  });

  it('4 · blocks with the re-acceptance modal until the user accepts (FR-58)', async () => {
    const user = userEvent.setup();
    const auth = signedIn({
      onboarding: { step: 5, completed: false, percent: 67 },
      legalPending: [{ slug: 'terminos', version: '0.2', requiresReacceptance: true }],
    });
    renderRoutesWithAuth(routes, '/app/descubrir', auth);
    const dialog = await screen.findByRole('dialog', {
      name: 'Hemos actualizado nuestras condiciones',
    });
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
    await user.keyboard('{Escape}');
    expect(dialog).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
    const { acceptLegalDocs } = await import('@/lib/callables');
    expect(vi.mocked(acceptLegalDocs).mock.calls[0]?.[0]).toEqual({
      items: [{ slug: 'terminos', version: '0.2' }],
    });
    expect(auth.refreshMe).toHaveBeenCalled();
  });
});
