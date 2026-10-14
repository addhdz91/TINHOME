import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageLikeSheet } from '@/features/match/components/MessageLikeSheet';
import { renderRoutesWithAuth, renderWithProviders } from '@/test/render';
import { signedIn } from '@/test/session';
import { premiumRoutes } from './routes';

const callables = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  withdrawSubscription: vi.fn(),
  getReferralSummary: vi.fn(),
}));
vi.mock('@/lib/callables', () => callables);
vi.mock('@/features/cities', () => ({
  useCities: () => ({
    data: [
      { id: 'madrid', name: 'Madrid', status: 'OPEN' },
      { id: 'valencia', name: 'Valencia', status: 'OPEN' },
    ],
  }),
}));

const routes = [{ path: '/app', children: premiumRoutes }];

beforeEach(() => vi.clearAllMocks());

describe('PremiumPage (S-12, FR-36/38)', () => {
  it('requires the immediate-start consent before going to the checkout', async () => {
    const user = userEvent.setup();
    callables.createCheckoutSession.mockReturnValue(new Promise(() => undefined));
    renderRoutesWithAuth(routes, '/app/premium', signedIn());
    const pay = await screen.findByRole('button', { name: 'Continuar al pago seguro' });
    expect(pay).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /Mensual/ }));
    await user.click(screen.getByRole('checkbox', { name: /empezar a usar Premium ahora/ }));
    await user.click(pay);
    expect(callables.createCheckoutSession).toHaveBeenCalledWith({
      plan: 'MONTHLY',
      acceptImmediateStart: true,
    });
    expect(await screen.findByRole('button', { name: 'Abriendo el pago…' })).toBeDisabled();
  });

  it('shows the active subscription with manage and withdrawal', async () => {
    renderRoutesWithAuth(
      routes,
      '/app/premium',
      signedIn({
        premium: {
          active: true,
          until: '2027-04-01T00:00:00.000Z',
          source: 'STRIPE',
          plan: 'YEARLY',
          cancelAtPeriodEnd: true,
          canWithdraw: true,
        },
      }),
    );
    expect(await screen.findByText('Tu Premium está activo')).toBeInTheDocument();
    expect(screen.getByText('Termina el')).toBeInTheDocument();
    expect(screen.getByText('1 de abril de 2027')).toBeInTheDocument();
    expect(screen.getByText('Anual')).toBeInTheDocument();
    expect(screen.getByText(/Has cancelado la renovación/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gestionar suscripción' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desistir de la suscripción' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continuar al pago seguro' })).toBeNull();
  });

  it('a Premium granted by an admin has no portal or withdrawal', async () => {
    renderRoutesWithAuth(
      routes,
      '/app/premium',
      signedIn({
        premium: {
          active: true,
          until: '2027-04-01T00:00:00.000Z',
          source: 'ADMIN',
          plan: null,
          cancelAtPeriodEnd: false,
          canWithdraw: false,
        },
      }),
    );
    expect(await screen.findByText('Activo hasta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gestionar suscripción' })).toBeNull();
  });
});

describe('InvitePage (S-13, FR-39)', () => {
  it('shows the link, the reward and the invited people', async () => {
    callables.getReferralSummary.mockResolvedValue({
      code: 'ABCDEFGH',
      link: 'https://tinhome.es/r/ABCDEFGH',
      invited: [
        { displayName: 'Ana P.', status: 'REWARDED', createdAt: '2027-02-01T10:00:00.000Z' },
        { displayName: '', status: 'REGISTERED', createdAt: '2027-02-02T10:00:00.000Z' },
      ],
      rewardsThisYear: 1,
      maxRewards: 6,
      rewardDays: 30,
    });
    renderRoutesWithAuth(
      routes,
      '/app/invita',
      signedIn({
        city: {
          id: 'madrid',
          name: 'Madrid',
          status: 'OPEN',
          progress: { count: 0, threshold: 0 },
        },
      }),
    );
    expect(await screen.findByText('Invita a alguien de Valencia')).toBeInTheDocument();
    expect(screen.getByText(/los dos tendréis 30 días de Premium/)).toBeInTheDocument();
    expect(screen.getByText('https://tinhome.es/r/ABCDEFGH')).toBeInTheDocument();
    expect(screen.getByText('Este año llevas 1 recompensa de 6.')).toBeInTheDocument();
    expect(screen.getByText('Ana P.')).toBeInTheDocument();
    expect(screen.getByText('Alguien')).toBeInTheDocument();
    expect(screen.getByText('Registrada, pendiente de verificar')).toBeInTheDocument();
  });

  it('shows the empty state', async () => {
    callables.getReferralSummary.mockResolvedValue({
      code: 'ABCDEFGH',
      link: 'https://tinhome.es/r/ABCDEFGH',
      invited: [],
      rewardsThisYear: 0,
      maxRewards: 6,
      rewardDays: 30,
    });
    renderRoutesWithAuth(routes, '/app/invita', signedIn());
    expect(await screen.findByText('Aún no has invitado a nadie')).toBeInTheDocument();
  });
});

describe('MessageLikeSheet (S-17, FR-61)', () => {
  it('fills a suggestion and sends it', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(async () => undefined);
    renderWithProviders(
      <MessageLikeSheet open onOpenChange={() => undefined} targetName="Javier" onSend={onSend} />,
    );
    expect(screen.getByRole('dialog', { name: 'Escribe a Javier' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Viajamos en familia/ }));
    await user.click(screen.getByRole('button', { name: 'Enviar con me gusta' }));
    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith(
        '¡Hola! Viajamos en familia y tu casa nos encaja muy bien.',
      ),
    );
  });

  it('does not send contact details (BR-22)', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn(async () => undefined);
    renderWithProviders(
      <MessageLikeSheet open onOpenChange={() => undefined} targetName="Javier" onSend={onSend} />,
    );
    await user.type(screen.getByRole('textbox', { name: 'Tu mensaje' }), 'Llámame al 612345678');
    expect(screen.getByRole('button', { name: 'Enviar con me gusta' })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
