import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { profileRoutes } from './routes';

const callables = vi.hoisted(() => ({
  updateSettings: vi.fn(async () => ({ ok: true })),
  signOutEverywhere: vi.fn(),
}));
vi.mock('@/lib/callables', () => callables);

describe('ProfilePage', () => {
  it('shows progress, saves the theme in the account and offers help and sign-out', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(
      [{ path: '/app', children: profileRoutes }],
      '/app/perfil',
      signedIn({ onboarding: { step: 5, completed: false, percent: 67 } }),
    );

    expect(await screen.findByText('Perfil completado: 67 %')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Negro' }));
    expect(callables.updateSettings).toHaveBeenCalledWith({ theme: 'black' });
    expect(document.documentElement).toHaveAttribute('data-theme', 'black');
    expect(screen.getByRole('link', { name: 'Ayuda' })).toHaveAttribute('href', '/ayuda');
    expect(
      screen.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }),
    ).toBeInTheDocument();
  });

  it('asks for the password before signing out everywhere (FR-71)', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth([{ path: '/app', children: profileRoutes }], '/app/perfil', signedIn());
    await user.click(
      await screen.findByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }),
    );
    expect(
      await screen.findByRole('dialog', { name: '¿Cerrar sesión en todos los dispositivos?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar todas las sesiones' })).toBeDisabled();
  });
});
