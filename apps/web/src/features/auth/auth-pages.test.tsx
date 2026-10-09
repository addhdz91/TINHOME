import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/app-error';
import { renderRoutesWithAuth } from '@/test/render';
import { authValue, fakeUser, signedIn } from '@/test/session';
import { authRoutes } from './routes';

const actions = vi.hoisted(() => ({
  signUpWithEmail: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  sendVerificationEmail: vi.fn(async () => undefined),
  resendCooldownSeconds: vi.fn(() => 0),
  requestPasswordReset: vi.fn(async () => undefined),
  rememberReferral: vi.fn(),
  rememberedReferral: vi.fn((): string | null => null),
  forgetReferral: vi.fn(),
}));
vi.mock('./lib/auth-actions', () => actions);

const callables = vi.hoisted(() => ({
  completeSignup: vi.fn(),
  updateSettings: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/callables', () => callables);

const routes = [
  ...authRoutes.map((r) => ({ ...r, path: `/${r.path ?? ''}` })),
  { path: '/app', element: <p>{'at app'}</p> },
  { path: '/verifica-email-done', element: null },
];

beforeEach(() => {
  vi.clearAllMocks();
});

async function fillRegister(user: ReturnType<typeof userEvent.setup>, birthDate = '1990-05-10') {
  await user.type(await screen.findByLabelText('Nombre'), 'Laura');
  await user.type(screen.getByLabelText('Apellidos'), 'García');
  await user.type(screen.getByLabelText('Fecha de nacimiento'), birthDate);
  await user.type(screen.getByLabelText('Email'), 'laura@ejemplo.es');
  await user.type(screen.getByLabelText('Contraseña'), 'casaenruzafa7');
}

async function acceptLegal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
  await user.click(screen.getByRole('checkbox', { name: /Política de privacidad/ }));
}

describe('RegisterPage (FR-01)', () => {
  it('AC-01.4 — the button stays disabled until Terms and Privacy are accepted', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/registro', authValue({ status: 'signedOut' }));
    const submit = await screen.findByRole('button', { name: 'Crear cuenta' });
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Acepto los Términos/ }));
    expect(submit).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Política de privacidad/ }));
    expect(submit).toBeEnabled();
  });

  it('AC-01.2 — rejects a minor before creating any account', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/registro', authValue({ status: 'signedOut' }));
    await fillRegister(user, '2015-01-01');
    await acceptLegal(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByText('Debes ser mayor de edad para usar TinHome.'),
    ).toBeInTheDocument();
    expect(actions.signUpWithEmail).not.toHaveBeenCalled();
  });

  it('AC-01.3 — explains that the e-mail exists and offers to sign in', async () => {
    actions.signUpWithEmail.mockRejectedValue({ code: 'auth/email-already-in-use' });
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/registro', authValue({ status: 'signedOut' }));
    await fillRegister(user);
    await acceptLegal(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText(/Ya existe una cuenta con este email/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Entrar con este email' })).toHaveAttribute(
      'href',
      '/entrar',
    );
  });

  it('creates the account with the current legal versions and sends the verification e-mail', async () => {
    const created = fakeUser({ emailVerified: false });
    actions.signUpWithEmail.mockResolvedValue(created);
    callables.completeSignup.mockResolvedValue({});
    const user = userEvent.setup();
    const auth = authValue({ status: 'signedOut' });
    renderRoutesWithAuth(routes, '/registro?ref=abcd-efgh', auth);

    expect(await screen.findByText(/Te ha invitado alguien de TinHome/)).toBeInTheDocument();
    expect(screen.getByLabelText('Código de invitación')).toHaveValue('ABCDEFGH');
    await fillRegister(user);
    await acceptLegal(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(actions.sendVerificationEmail).toHaveBeenCalledWith(created));
    expect(callables.completeSignup.mock.calls[0]?.[0]).toEqual({
      firstName: 'Laura',
      lastName: 'García',
      birthDate: '1990-05-10',
      referralCode: 'ABCDEFGH',
      acceptedTerms: '0.1-provisional',
      acceptedPrivacy: '0.1-provisional',
    });
    expect(actions.forgetReferral).toHaveBeenCalled();
  });

  it('deletes the Auth user if the server refuses a minor (defence in depth)', async () => {
    const deleteUser = vi.fn(async () => undefined);
    const created = fakeUser({ delete: deleteUser });
    actions.signUpWithEmail.mockResolvedValue(created);
    callables.completeSignup.mockRejectedValue(new AppError('E_UNDERAGE'));
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/registro', authValue({ status: 'signedOut' }));
    await fillRegister(user);
    await acceptLegal(user);
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByText('Debes ser mayor de edad para usar TinHome.'),
    ).toBeInTheDocument();
    expect(deleteUser).toHaveBeenCalled();
  });

  it('asks a first-time Google user only for the missing data', async () => {
    renderRoutesWithAuth(
      routes,
      '/registro',
      authValue({ status: 'needsProfile', user: fakeUser({ displayName: 'Laura García López' }) }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Completa tu registro' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveValue('Laura');
    expect(screen.getByLabelText('Apellidos')).toHaveValue('García López');
    expect(screen.queryByLabelText('Contraseña')).toBeNull();
  });

  it('sends a signed-in user to the app', async () => {
    renderRoutesWithAuth(routes, '/registro', signedIn());
    expect(await screen.findByText('at app')).toBeInTheDocument();
  });
});

describe('SignInPage and RecoverPage (FR-03)', () => {
  it('shows the same message for a wrong password or unknown e-mail', async () => {
    actions.signInWithEmail.mockRejectedValue({ code: 'auth/invalid-credential' });
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/entrar', authValue({ status: 'signedOut' }));
    await user.type(await screen.findByLabelText('Email'), 'nadie@ejemplo.es');
    await user.type(screen.getByLabelText('Contraseña'), 'loquesea123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El email o la contraseña no son correctos.',
    );
  });

  it('confirms the reset e-mail without revealing whether the account exists', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/recuperar', authValue({ status: 'signedOut' }));
    await user.type(await screen.findByLabelText('Email'), 'nadie@ejemplo.es');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));
    expect(await screen.findByText(/Si hay una cuenta con ese email/)).toBeInTheDocument();
    expect(actions.requestPasswordReset).toHaveBeenCalledWith('nadie@ejemplo.es');
  });
});

describe('VerifyEmailPage (FR-02)', () => {
  it('masks the e-mail and limits resending', async () => {
    actions.resendCooldownSeconds.mockReturnValue(42);
    renderRoutesWithAuth(
      routes,
      '/verifica-email',
      signedIn(
        { verification: { emailVerified: false, phoneVerified: false, identity: 'NONE' } },
        { email: 'laura@demo.tinhome' },
      ),
    );
    expect(await screen.findByText('l****@demo.tinhome')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reenviar en 42 s' })).toBeDisabled();
  });
});

describe('InvitePage', () => {
  it('remembers a valid code and opens the sign-up with it', async () => {
    renderRoutesWithAuth(routes, '/i/abcdefgh', authValue({ status: 'signedOut' }));
    expect(await screen.findByLabelText('Código de invitación')).toHaveValue('ABCDEFGH');
    expect(actions.rememberReferral).toHaveBeenCalledWith('ABCDEFGH');
  });
});
