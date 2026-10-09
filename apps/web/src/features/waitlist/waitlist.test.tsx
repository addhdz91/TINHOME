import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/app-error';
import { renderRoutes } from '@/test/render';
import { waitlistRoutes } from './routes';

const callables = vi.hoisted(() => ({ joinWaitlist: vi.fn(), confirmWaitlist: vi.fn() }));
vi.mock('@/lib/callables', () => callables);

beforeEach(() => {
  callables.joinWaitlist.mockReset();
  callables.confirmWaitlist.mockReset();
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email'), 'visitante@ejemplo.es');
  await user.selectOptions(screen.getByLabelText('Tu ciudad'), 'malaga');
  await user.click(screen.getByRole('checkbox', { name: 'Madrid' }));
  await user.click(screen.getByRole('checkbox', { name: 'Semana Santa 2027' }));
  await user.click(screen.getByRole('checkbox', { name: /política de privacidad/ }));
}

describe('WaitlistPage', () => {
  it('shows an error summary linked to each invalid field and does not submit', async () => {
    const user = userEvent.setup();
    renderRoutes(waitlistRoutes, '/lista-espera');
    await user.click(await screen.findByRole('button', { name: 'Apuntarme' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('Escribe un email válido.');
    expect(summary).toHaveTextContent('Elige tu ciudad.');
    expect(summary).toHaveTextContent('Elige al menos una ciudad de destino.');
    expect(summary).toHaveTextContent('Necesitamos que aceptes la política de privacidad.');
    expect(screen.getByRole('link', { name: 'Elige tu ciudad.' })).toHaveAttribute(
      'href',
      '#waitlist-cityId',
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(callables.joinWaitlist).not.toHaveBeenCalled();
  });

  it('never offers the own city as destination', async () => {
    const user = userEvent.setup();
    renderRoutes(waitlistRoutes, '/lista-espera');
    await user.selectOptions(await screen.findByLabelText('Tu ciudad'), 'malaga');
    expect(screen.queryByRole('checkbox', { name: 'Málaga' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Valencia' })).toBeInTheDocument();
  });

  it('sends the accepted privacy version and shows «Revisa tu email»', async () => {
    callables.joinWaitlist.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderRoutes(waitlistRoutes, '/lista-espera');
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Apuntarme' }));

    expect(await screen.findByRole('heading', { name: 'Revisa tu email' })).toBeInTheDocument();
    expect(callables.joinWaitlist.mock.calls[0]?.[0]).toEqual({
      email: 'visitante@ejemplo.es',
      cityId: 'malaga',
      destinations: ['madrid'],
      windowIds: ['semana-santa-2027'],
      acceptPrivacy: '0.1-provisional',
    });
  });

  it('shows the catalogue message for server errors', async () => {
    callables.joinWaitlist.mockRejectedValue(new AppError('E_RATE_LIMIT'));
    const user = userEvent.setup();
    renderRoutes(waitlistRoutes, '/lista-espera');
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Apuntarme' }));
    expect(await screen.findByText('Vas muy rápido. Espera un momento.')).toBeInTheDocument();
  });
});

describe('WaitlistConfirmPage', () => {
  it('confirms the token, shows the position and the city progress, and clears the URL', async () => {
    callables.confirmWaitlist.mockResolvedValue({ cityId: 'malaga', position: 215 });
    const replaceState = vi.spyOn(window.history, 'replaceState');
    renderRoutes(waitlistRoutes, `/lista-espera/confirmar?token=${'a'.repeat(43)}`);

    expect(
      await screen.findByRole('heading', { name: '¡Ya estás en la lista!' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Eres la persona n.º 215 en la lista de Málaga.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Málaga' })).toBeInTheDocument();
    expect(callables.confirmWaitlist).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalled();
  });

  it('explains an invalid or expired link', async () => {
    callables.confirmWaitlist.mockRejectedValue(new AppError('E_TOKEN_INVALID'));
    renderRoutes(waitlistRoutes, `/lista-espera/confirmar?token=${'b'.repeat(43)}`);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'El enlace no es válido o ha caducado',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Apuntarme de nuevo' })).toHaveAttribute(
      'href',
      '/lista-espera',
    );
  });

  it('handles a link without token', async () => {
    renderRoutes(waitlistRoutes, '/lista-espera/confirmar');
    expect(await screen.findByText(/Falta el código del enlace/)).toBeInTheDocument();
    expect(callables.confirmWaitlist).not.toHaveBeenCalled();
  });
});
