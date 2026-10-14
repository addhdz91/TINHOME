import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { AdminRoleProvider } from './components/AdminRoleProvider';
import { MetricsPage } from './pages/MetricsPage';
import { UsersPage } from './pages/UsersPage';

vi.mock('@/features/cities', () => ({
  useCities: () => ({ data: [{ id: 'madrid', name: 'Madrid' }] }),
}));
const callables = vi.hoisted(() => ({
  adminSearchUsers: vi.fn(async () => ({
    items: [
      {
        uid: 'laura',
        displayName: 'Laura G.',
        email: 'laura@demo.tinhome',
        phoneE164: null,
        cityId: 'madrid',
        status: 'ACTIVE',
        identity: 'APPROVED',
        premiumUntil: null,
        premiumSource: null,
        role: null,
        createdAt: null,
      },
    ],
    nextCursor: null,
  })),
  adminGetMetrics: vi.fn(async () => ({
    funnel: [
      { step: 'registered', count: 10 },
      { step: 'phoneVerified', count: 8 },
      { step: 'homePublished', count: 5 },
      { step: 'identityApproved', count: 4 },
      { step: 'firstLike', count: 3 },
      { step: 'matched', count: 2 },
      { step: 'exchangeConfirmed', count: 1 },
      { step: 'reviewed', count: 1 },
    ],
    premium: { active: 3, bySource: { STRIPE: 2, ADMIN: 1 }, conversionPercent: 20 },
    demand: [{ fromCityId: 'madrid', toCityId: 'valencia', windowId: 'ss27', count: 7 }],
    sponsored: [],
    truncated: false,
  })),
  adminExportCsv: vi.fn(async () => ({ url: 'data:text/csv;base64,', expiresAt: '' })),
}));
vi.mock('@/lib/callables', () => callables);

beforeEach(() => vi.clearAllMocks());

const render = (element: React.ReactElement, path = '/') =>
  renderRoutesWithAuth(
    [{ path: '/', element: <AdminRoleProvider adminRole="admin">{element}</AdminRoleProvider> }],
    path,
    signedIn({ roles: ['admin'] }),
  );

describe('admin users and metrics (FR-50, FR-54)', () => {
  it('searches users and links to the record', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    expect(screen.getByText('Escribe al menos 2 caracteres.')).toBeInTheDocument();
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre, email o teléfono' }),
      'laura',
    );
    await user.click(screen.getByRole('button', { name: 'Buscar por nombre, email o teléfono' }));
    await waitFor(() =>
      expect(callables.adminSearchUsers).toHaveBeenCalledWith({ q: 'laura', limit: 50 }),
    );
    expect(await screen.findByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      '/admin/usuarios/laura',
    );
  });

  it('shows the funnel with values as text and exports CSV', async () => {
    const user = userEvent.setup();
    render(<MetricsPage />);
    expect(await screen.findByText('Registros')).toBeInTheDocument();
    expect(screen.getByText(/^8 · 80 %$/)).toBeInTheDocument();
    expect(screen.getByText('Conversión a pago: 20 %', { exact: false })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'CSV demanda' }));
    await waitFor(() =>
      expect(callables.adminExportCsv).toHaveBeenCalledWith(
        expect.objectContaining({ report: 'DEMAND' }),
      ),
    );
  });
});
