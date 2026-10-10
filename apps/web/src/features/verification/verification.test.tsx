import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeOwnerView, MyVerification } from '@tinhome/shared/schemas';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { verificationRoutes } from './routes';

vi.mock('@/lib/firebase', () => ({ firebase: () => ({ db: {}, storage: {} }) }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), onSnapshot: vi.fn(() => () => undefined) }));
const callables = vi.hoisted(() => ({
  getMyHome: vi.fn(),
  getMyVerification: vi.fn(),
  submitIdentityVerification: vi.fn(),
  verifyHomeLocation: vi.fn(),
  requestLocationReview: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/callables', () => callables);

const home = (overrides: Partial<HomeOwnerView> = {}): HomeOwnerView => ({
  id: 'laura',
  status: 'PUBLISHED',
  visible: false,
  complete: true,
  cityId: 'madrid',
  tenure: 'OWNER',
  photos: [],
  destinations: null,
  availability: null,
  travelers: null,
  declarationVersion: '0.1',
  locationCheck: 'NONE',
  moderationHold: null,
  visibilityProblems: ['IDENTITY', 'LOCATION'],
  ...overrides,
});

const verification = (overrides: Partial<MyVerification> = {}): MyVerification => ({
  id: 'v1',
  status: 'PENDING',
  tenure: 'OWNER',
  propertyDocType: 'IBI_RECEIPT',
  decisionReason: null,
  infoRequest: null,
  submittedAt: '2027-03-01T09:00:00.000Z',
  decidedAt: null,
  ...overrides,
});

const routes = [{ path: '/app', children: verificationRoutes }];

beforeEach(() => {
  vi.clearAllMocks();
  callables.getMyHome.mockResolvedValue({ home: home() });
  callables.getMyVerification.mockResolvedValue({ verification: null });
});

describe('VerificationPage (S-14)', () => {
  it('blocks sending while documents are missing and explains why (AC-08.1)', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/verificacion', signedIn());
    await user.click(await screen.findByRole('button', { name: 'Enviar para revisión' }));
    expect(await screen.findByText('Revisa los campos marcados.')).toBeInTheDocument();
    expect(screen.getAllByText('Falta este documento.')).toHaveLength(4);
    expect(callables.submitIdentityVerification).not.toHaveBeenCalled();
  });

  it('asks tenants for the landlord authorization with a link to the model (AC-08.2)', async () => {
    const user = userEvent.setup();
    callables.getMyHome.mockResolvedValue({ home: home({ tenure: 'TENANT' }) });
    renderRoutesWithAuth(routes, '/app/verificacion', signedIn());
    expect(await screen.findByText('Autorización de la persona propietaria')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'modelo de autorización' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enviar para revisión' }));
    expect(
      await screen.findByText(/necesitas la autorización por escrito de la persona propietaria/),
    ).toBeInTheDocument();
  });

  it('rejects files that are too big or of another type (AC-08.3)', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderRoutesWithAuth(routes, '/app/verificacion', signedIn());
    const input = await screen.findByLabelText('DNI/NIE: anverso');
    await user.upload(input, new File(['x'], 'notas.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Usa JPG, PNG, WEBP, HEIC o PDF.')).toBeInTheDocument();
  });

  it('shows the pending status instead of the form', async () => {
    callables.getMyVerification.mockResolvedValue({ verification: verification() });
    renderRoutesWithAuth(routes, '/app/verificacion', signedIn());
    expect(await screen.findByText('En revisión')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar para revisión' })).not.toBeInTheDocument();
  });

  it('shows the rejection reason and lets the user send again', async () => {
    callables.getMyVerification.mockResolvedValue({
      verification: verification({ status: 'REJECTED', decisionReason: 'La foto está borrosa.' }),
    });
    renderRoutesWithAuth(routes, '/app/verificacion', signedIn());
    expect(await screen.findByText('Motivo: La foto está borrosa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar para revisión' })).toBeInTheDocument();
  });
});

describe('LocationCheck (S-18, FR-63)', () => {
  it('on a computer shows a QR to continue on the phone', async () => {
    renderRoutesWithAuth(routes, '/app/verificacion/ubicacion', signedIn());
    expect(await screen.findByText('Continúa en el móvil')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verificar ubicación' })).not.toBeInTheDocument();
  });

  it('reads the position and offers a manual review when it does not match', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({
            coords: { latitude: 39.47, longitude: -0.38, accuracy: 15 },
          } as GeolocationPosition),
      },
    });
    callables.verifyHomeLocation.mockResolvedValue({
      result: 'FAIL',
      distanceKm: 303,
      attemptsLeft: 4,
    });
    callables.getMyHome
      .mockResolvedValueOnce({ home: home() })
      .mockResolvedValue({ home: home({ locationCheck: 'FAIL' }) });
    renderRoutesWithAuth(routes, '/app/verificacion/ubicacion', signedIn());
    await user.click(
      await screen.findByRole('button', { name: 'Estoy en casa con este dispositivo' }),
    );
    await user.click(screen.getByRole('button', { name: 'Verificar ubicación' }));
    await waitFor(() =>
      expect(callables.verifyHomeLocation).toHaveBeenCalledWith({
        lat: 39.47,
        lng: -0.38,
        accuracyM: 15,
        isMobile: false,
      }),
    );
    expect(await screen.findByText(/a unos 303 km del centro/)).toBeInTheDocument();
    expect(screen.getByText('Te quedan 4 intentos hoy.')).toBeInTheDocument();
    await user.type(
      await screen.findByLabelText('Solicitar revisión manual'),
      'Vivo en el límite.',
    );
    await user.click(screen.getByRole('button', { name: 'Solicitar revisión' }));
    await waitFor(() =>
      expect(callables.requestLocationReview).toHaveBeenCalledWith({ note: 'Vivo en el límite.' }),
    );
  });

  it('shows the verified state', async () => {
    callables.getMyHome.mockResolvedValue({ home: home({ locationCheck: 'PASS' }) });
    renderRoutesWithAuth(routes, '/app/verificacion/ubicacion', signedIn());
    expect(await screen.findByText('Ubicación verificada en Madrid.')).toBeInTheDocument();
  });
});
