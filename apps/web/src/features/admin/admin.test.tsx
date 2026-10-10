import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from 'firebase/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminLayout } from '@/app/layouts/AdminLayout';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { adminRoutes } from './routes';

vi.mock('@/lib/firebase', () => ({ firebase: () => ({ auth: {} }) }));
vi.mock('firebase/auth', () => ({ multiFactor: () => ({ enrolledFactors: [] }) }));
const callables = vi.hoisted(() => ({
  adminGetDashboard: vi.fn(),
  adminGetVerification: vi.fn(),
  adminGetVerificationFileUrl: vi.fn(),
  adminDecideVerification: vi.fn(),
  adminListVerifications: vi.fn(),
}));
vi.mock('@/lib/callables', () => callables);

function adminUser(claims: Record<string, unknown>, secondFactor: string | null): Partial<User> {
  return {
    email: 'admin@demo.tinhome',
    getIdTokenResult: vi.fn(async () => ({ claims, signInSecondFactor: secondFactor })),
  } as unknown as Partial<User>;
}

const routes = [{ path: '/admin', element: <AdminLayout />, children: adminRoutes }];

const detail = {
  verification: {
    id: 'v1',
    uid: 'laura',
    displayName: 'Laura M.',
    cityId: 'madrid',
    tenure: 'OWNER',
    status: 'PENDING',
    submittedAt: '2027-03-01T09:00:00.000Z',
    duplicate: true,
    fraudSuspicion: false,
    propertyDocType: 'IBI_RECEIPT',
    files: ['idFront', 'selfie'],
    filesPurged: false,
    reviewerUid: null,
    decisionReason: null,
    infoRequest: null,
    decidedAt: null,
  },
  user: {
    uid: 'laura',
    firstName: 'Laura',
    lastName: 'Martín',
    birthDate: '1991-04-12',
    email: 'laura@demo.tinhome',
    cityId: 'madrid',
  },
  home: null,
  duplicateUser: { uid: 'otra', displayName: 'Otra P.' },
};

beforeEach(() => {
  vi.clearAllMocks();
  callables.adminGetDashboard.mockResolvedValue({
    pendingVerifications: { count: 3, oldestAt: '2027-03-01T09:00:00.000Z' },
    pendingLocationReviews: 1,
    openReports: 0,
    newUsers7d: 12,
    cities: [
      {
        id: 'madrid',
        name: 'Madrid',
        status: 'OPEN',
        visibleCandidates: 40,
        threshold: 150,
        foundersAwarded: 7,
      },
    ],
    matches7d: 0,
    exchangesConfirmed30d: 0,
    premiumBySource: { STRIPE: 1, FOUNDER: 7, REFERRAL: 2, ADMIN: 0 },
  });
  callables.adminGetVerification.mockResolvedValue(detail);
  callables.adminGetVerificationFileUrl.mockResolvedValue({
    url: 'https://example.test/doc',
    contentType: 'image/png',
    expiresAt: '2027-03-01T09:05:00.000Z',
  });
  callables.adminDecideVerification.mockResolvedValue({
    verification: { ...detail.verification, status: 'APPROVED' },
  });
});

describe('admin guard (FR-48)', () => {
  it('denies people without an admin role', async () => {
    renderRoutesWithAuth(routes, '/admin', signedIn({}, adminUser({}, null)));
    expect(await screen.findByRole('heading', { name: 'No tienes acceso' })).toBeInTheDocument();
    expect(callables.adminGetDashboard).not.toHaveBeenCalled();
  });

  it('asks an admin without a second factor to enrol TOTP', async () => {
    renderRoutesWithAuth(routes, '/admin', signedIn({}, adminUser({ role: 'admin' }, null)));
    expect(
      await screen.findByRole('heading', { name: 'Activa la verificación en dos pasos' }),
    ).toBeInTheDocument();
    expect(callables.adminGetDashboard).not.toHaveBeenCalled();
  });

  it('shows the dashboard with KPIs to an admin with a second factor (FR-49)', async () => {
    renderRoutesWithAuth(routes, '/admin', signedIn({}, adminUser({ role: 'admin' }, 'totp')));
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
    expect(await screen.findByText('Verificaciones pendientes')).toBeInTheDocument();
    expect(screen.getByText('40 / 150')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verificaciones' })).toBeInTheDocument();
  });
});

describe('verification detail (FR-09)', () => {
  it('warns about a duplicate document, watermarks the viewer and approves with the A shortcut', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(
      routes,
      '/admin/verificaciones/v1',
      signedIn({}, adminUser({ role: 'admin' }, 'totp')),
    );
    expect(
      await screen.findByText('Este número de documento ya está en otra cuenta: Otra P.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'DNI/NIE: anverso' })).toHaveAttribute(
      'draggable',
      'false',
    );
    expect(screen.getAllByText(/Solo revisión · admin@demo.tinhome/).length).toBeGreaterThan(0);
    await user.keyboard('a');
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(callables.adminDecideVerification).toHaveBeenCalledWith({
        id: 'v1',
        decision: 'APPROVE',
        fraudSuspicion: false,
      }),
    );
  });

  it('needs a reason to reject', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(
      routes,
      '/admin/verificaciones/v1',
      signedIn({}, adminUser({ role: 'admin' }, 'totp')),
    );
    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    await user.type(
      screen.getByLabelText('Motivo del rechazo (lo verá la persona)'),
      'Documento caducado.',
    );
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() =>
      expect(callables.adminDecideVerification).toHaveBeenCalledWith({
        id: 'v1',
        decision: 'REJECT',
        reason: 'Documento caducado.',
        fraudSuspicion: false,
      }),
    );
  });
});
