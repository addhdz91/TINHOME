import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetMyStandingOutput } from '@tinhome/shared/schemas';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { ReportButton } from './components/ReportButton';
import { safetyRoutes } from './routes';

vi.mock('@/lib/firebase', () => ({ firebase: () => ({ storage: {} }) }));
vi.mock('firebase/storage', () => ({ ref: vi.fn(), uploadBytes: vi.fn(async () => undefined) }));
const callables = vi.hoisted(() => ({
  submitReport: vi.fn(async () => ({ reportId: 'r1', priority: 'HIGH', preventiveHold: true })),
  getMyStanding: vi.fn(),
  submitAppeal: vi.fn(async () => ({ appealId: 'a1' })),
}));
vi.mock('@/lib/callables', () => callables);

beforeEach(() => vi.clearAllMocks());

describe('ReportButton / ReportDialog (FR-42)', () => {
  it('reports a home in two taps with a reason and a description', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(
      [
        {
          path: '/',
          element: (
            <ReportButton targetType="HOME" targetId="javier" targetName="Ático en Ruzafa" />
          ),
        },
      ],
      '/',
      signedIn(),
    );
    await user.click(screen.getByRole('button', { name: 'Denunciar esta casa' }));
    const dialog = screen.getByRole('dialog', { name: 'Denunciar la casa «Ático en Ruzafa»' });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText('La persona denunciada no sabrá quién la ha denunciado.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enviar denuncia' }));
    expect(screen.getByText('Elige un motivo.')).toBeInTheDocument();
    expect(callables.submitReport).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('radio', {
        name: 'Fotos que no son de su vivienda o suplantación de otra casa',
      }),
    );
    await user.type(
      screen.getByRole('textbox', { name: '¿Qué ha pasado?' }),
      'Las fotos son de otro anuncio de Idealista.',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar denuncia' }));
    await waitFor(() =>
      expect(callables.submitReport).toHaveBeenCalledWith({
        targetType: 'HOME',
        targetId: 'javier',
        reason: 'PHOTOS_NOT_OWN',
        description: 'Las fotos son de otro anuncio de Idealista.',
      }),
    );
  });

  it('offers to block too when reporting a person', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(
      [
        {
          path: '/',
          element: (
            <ReportButton targetType="USER" targetId="javier" targetName="Javier S." canBlock />
          ),
        },
      ],
      '/',
      signedIn(),
    );
    await user.click(screen.getByRole('button', { name: 'Denunciar a Javier S.' }));
    await user.click(screen.getByRole('radio', { name: 'Trato grosero o irrespetuoso' }));
    await user.type(
      screen.getByRole('textbox', { name: '¿Qué ha pasado?' }),
      'Me ha insultado en el chat varias veces.',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Bloquear también a Javier S.' }));
    await user.click(screen.getByRole('button', { name: 'Enviar denuncia' }));
    await waitFor(() =>
      expect(callables.submitReport).toHaveBeenCalledWith(
        expect.objectContaining({ alsoBlock: true, reason: 'RUDE' }),
      ),
    );
  });
});

describe('MyStandingPage (S-20, FR-45, FR-68)', () => {
  const standing: GetMyStandingOutput = {
    strikes: [
      {
        id: 's1',
        reason: 'RUDE',
        severity: 'MINOR',
        createdAt: '2027-03-01T10:00:00.000Z',
        expiresAt: '2028-03-01T10:00:00.000Z',
      },
    ],
    actions: [
      {
        id: 'a1',
        action: 'WARN',
        targetType: 'USER',
        targetId: 'laura',
        statement: {
          templateId: 'RUDE',
          facts: 'Has insultado a otra persona en el chat.',
          ground: 'TERMS',
          groundDetail: 'Normas de la comunidad: trato respetuoso.',
          scope: 'Advertencia registrada en tu cuenta.',
          duration: 'La advertencia caduca a los 12 meses.',
          redress: 'Puedes recurrir en los próximos 6 meses.',
        },
        suspendedUntil: null,
        adminUid: 'admin',
        createdAt: '2027-03-01T10:00:00.000Z',
        appeal: null,
        appealable: true,
      },
    ],
    hold: null,
  };

  it('shows the statement of reasons and lets the person appeal', async () => {
    const user = userEvent.setup();
    callables.getMyStanding.mockResolvedValue(standing);
    renderRoutesWithAuth([{ path: '/app', children: safetyRoutes }], '/app/mi-cuenta', signedIn());
    expect(await screen.findByText('Tienes 1 advertencia activa')).toBeInTheDocument();
    expect(screen.getByText('Has insultado a otra persona en el chat.')).toBeInTheDocument();
    expect(screen.getByText('Puedes recurrir en los próximos 6 meses.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Recurrir esta decisión' }));
    const send = screen.getByRole('button', { name: 'Enviar recurso' });
    expect(send).toBeDisabled();
    await user.type(
      screen.getByRole('textbox', { name: '¿Por qué no estás de acuerdo?' }),
      'Fue un malentendido y ya pedí perdón.',
    );
    await user.click(send);
    await waitFor(() =>
      expect(callables.submitAppeal).toHaveBeenCalledWith({
        actionId: 'a1',
        text: 'Fue un malentendido y ya pedí perdón.',
      }),
    );
  });

  it('says when everything is in order', async () => {
    callables.getMyStanding.mockResolvedValue({ strikes: [], actions: [], hold: null });
    renderRoutesWithAuth([{ path: '/app', children: safetyRoutes }], '/app/mi-cuenta', signedIn());
    expect(await screen.findByText('Todo en orden')).toBeInTheDocument();
  });
});
