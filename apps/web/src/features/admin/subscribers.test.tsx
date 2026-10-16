import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { AdminRoleProvider } from './components/AdminRoleProvider';
import { SubscribersPage } from './pages/SubscribersPage';

vi.mock('@/features/cities', () => ({
  useCities: () => ({ data: [{ id: 'madrid', name: 'Madrid' }] }),
}));
const callables = vi.hoisted(() => ({
  adminGetSubscriberStats: vi.fn(async () => ({
    segments: [
      { segment: 'PAID_ACTIVE', count: 2, marketingOptIn: 1 },
      { segment: 'PAID_CANCELING', count: 1, marketingOptIn: 0 },
      { segment: 'GIFTED', count: 4, marketingOptIn: 3 },
      { segment: 'LAPSED_PAID', count: 1, marketingOptIn: 1 },
      { segment: 'LAPSED_GIFTED', count: 0, marketingOptIn: 0 },
      { segment: 'FREE', count: 12, marketingOptIn: 5 },
    ],
    plans: { monthly: 1, yearly: 1 },
    mrrCents: 1657,
    expiringIn30Days: 3,
    total: 20,
    truncated: false,
  })),
  adminListSubscribers: vi.fn(async () => ({
    items: [
      {
        uid: 'gifted1',
        displayName: 'Marta Ruiz',
        email: 'marta@demo.tinhome',
        cityId: 'madrid',
        segment: 'GIFTED',
        premiumSource: 'FOUNDER',
        premiumUntil: '2027-03-15T00:00:00.000Z',
        daysLeft: 14,
        plan: null,
        cancelAtPeriodEnd: false,
        marketingOptIn: true,
        createdAt: '2027-01-01T00:00:00.000Z',
      },
    ],
    nextCursor: null,
    total: 1,
  })),
  adminExportSubscribers: vi.fn(async () => ({
    url: 'data:text/csv;base64,',
    expiresAt: '',
    rows: 3,
  })),
}));
vi.mock('@/lib/callables', () => callables);

beforeEach(() => vi.clearAllMocks());

const render = () =>
  renderRoutesWithAuth(
    [
      {
        path: '/',
        element: (
          <AdminRoleProvider adminRole="superadmin">
            <SubscribersPage />
          </AdminRoleProvider>
        ),
      },
    ],
    '/',
    signedIn({ roles: ['superadmin'] }),
  );

describe('subscribers panel (marketing)', () => {
  it('shows revenue, segments with their suggested action and the people behind them', async () => {
    render();
    expect(await screen.findByText('16,57 €')).toBeInTheDocument();
    expect(screen.getByText('1 mensuales · 1 anuales (IVA incluido)')).toBeInTheDocument();
    const gifted = screen.getByRole('button', { name: /Premium regalado/ });
    expect(within(gifted).getByText('3 aceptan emails comerciales')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Marta Ruiz' })).toHaveAttribute(
      'href',
      '/admin/usuarios/gifted1',
    );
    expect(screen.getByText(/Termina el 15 de marzo de 2027 \(en 14 días\)/)).toBeInTheDocument();
  });

  it('filters by segment and exports only for the chosen campaign', async () => {
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole('button', { name: /Ex-suscriptores/ }));
    expect(screen.getByRole('button', { name: /Ex-suscriptores/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() =>
      expect(callables.adminListSubscribers).toHaveBeenLastCalledWith(
        expect.objectContaining({ segment: 'LAPSED_PAID' }),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Exportar CSV para campaña' }));
    await waitFor(() =>
      expect(callables.adminExportSubscribers).toHaveBeenCalledWith({ segment: 'LAPSED_PAID' }),
    );
  });
});
