import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { onboardingRoutes } from './routes';

const phone = vi.hoisted(() => ({ sendPhoneCode: vi.fn() }));
vi.mock('./lib/phone', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...phone,
}));
const callables = vi.hoisted(() => ({
  confirmPhoneLinked: vi.fn(async () => ({ phoneVerified: true })),
}));
vi.mock('@/lib/callables', () => callables);

const routes = [
  { path: '/app', children: onboardingRoutes },
  { path: '/', element: <p>{'landing'}</p> },
];

beforeEach(() => vi.clearAllMocks());

describe('OnboardingPage (S-03)', () => {
  it('shows «Paso N de 6» and the welcome with the user name', async () => {
    renderRoutesWithAuth(routes, '/app/onboarding/1', signedIn());
    expect(await screen.findByRole('heading', { name: '¡Hola, Laura!' })).toBeInTheDocument();
    expect(screen.getAllByText('Paso 1 de 6')[0]).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Guardar y salir' })).toHaveAttribute('href', '/');
  });

  it('does not let the user skip ahead', async () => {
    renderRoutesWithAuth(routes, '/app/onboarding/5', signedIn());
    expect(
      await screen.findByRole('heading', { name: 'Verifica tu teléfono' }),
    ).toBeInTheDocument();
  });

  it('rejects non-Spanish or landline numbers before sending any SMS', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/onboarding/2', signedIn());
    await user.type(await screen.findByLabelText('Móvil'), '912345678');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(screen.getByText(/Escribe un móvil español de 9 cifras/)).toBeInTheDocument();
    expect(phone.sendPhoneCode).not.toHaveBeenCalled();
  });

  it('links the phone with the SMS code and moves to step 3 (FR-07)', async () => {
    const confirm = vi.fn(async () => ({}));
    phone.sendPhoneCode.mockResolvedValue({ confirm });
    const user = userEvent.setup();
    const auth = signedIn();
    renderRoutesWithAuth(routes, '/app/onboarding/2', auth);

    await user.type(await screen.findByLabelText('Móvil'), '612 345 678');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    const code = await screen.findByLabelText('Código de 6 cifras');
    expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    expect(screen.getByText('Te lo hemos enviado por SMS al +34 612 345 678.')).toBeInTheDocument();
    await user.type(code, '123456');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));

    await waitFor(() => expect(callables.confirmPhoneLinked).toHaveBeenCalled());
    expect(phone.sendPhoneCode.mock.calls[0]?.[1]).toBe('+34612345678');
    expect(confirm).toHaveBeenCalledWith('123456');
    expect(auth.refreshMe).toHaveBeenCalled();
  });

  it('explains a phone already used by another account (BR-02)', async () => {
    phone.sendPhoneCode.mockResolvedValue({
      confirm: vi.fn(async () =>
        Promise.reject(
          Object.assign(new Error('in use'), { code: 'auth/credential-already-in-use' }),
        ),
      ),
    });
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/onboarding/2', signedIn());
    await user.type(await screen.findByLabelText('Móvil'), '612345678');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    await user.type(await screen.findByLabelText('Código de 6 cifras'), '123456');
    await user.click(screen.getByRole('button', { name: 'Verificar' }));
    expect(
      await screen.findByText('Este número ya está en otra cuenta de TinHome.'),
    ).toBeInTheDocument();
  });
});
