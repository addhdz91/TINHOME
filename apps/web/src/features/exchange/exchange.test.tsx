import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toIsoDate, addDays } from '@tinhome/shared/domain';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import type { ExchangeDoc } from './lib/types';
import { exchangeRoutes } from './routes';

const today = toIsoDate(new Date());
const exchange = (overrides: Partial<ExchangeDoc> = {}): ExchangeDoc => ({
  id: 'e1',
  matchId: 'javier_laura',
  participants: ['javier', 'laura'],
  proposedBy: 'javier',
  startDate: addDays(today, 10),
  endDate: addDays(today, 18),
  nights: 8,
  guests: { laura: 2, javier: 3 },
  pets: { laura: 0, javier: 1 },
  note: 'Llegamos por la tarde',
  status: 'PROPOSED',
  expiresAt: new Date('2030-01-01T10:00:00Z'),
  cancelledBy: null,
  reviewDeadlineDate: null,
  ...overrides,
});

const state = vi.hoisted(() => ({
  exchange: null as ExchangeDoc | null,
  reviewed: false,
}));
vi.mock('./api/use-exchanges', () => ({
  useExchange: () => ({ status: 'ready', data: state.exchange }),
  useMyReview: () => ({ status: 'ready', data: state.reviewed }),
  useMyExchanges: () => ({ status: 'ready', data: state.exchange ? [state.exchange] : [] }),
}));
vi.mock('@/features/chat', () => ({
  useMatch: () => ({
    status: 'ready',
    data: {
      id: 'javier_laura',
      participants: ['javier', 'laura'],
      people: {
        javier: {
          displayName: 'Javier S.',
          homeTitle: 'Ático',
          cityId: 'valencia',
          cityName: 'Valencia',
          photoUrl: null,
        },
        laura: {
          displayName: 'Laura G.',
          homeTitle: 'Piso',
          cityId: 'madrid',
          cityName: 'Madrid',
          photoUrl: null,
        },
      },
    },
  }),
  useAgreementDownload: () => ({ download: vi.fn(), ready: true }),
}));
const callables = vi.hoisted(() => ({
  respondExchange: vi.fn(async () => ({})),
  cancelExchange: vi.fn(async () => ({})),
  submitReview: vi.fn(async () => ({
    review: { id: 'e1_laura', status: 'PENDING', publishedAt: null },
    published: false,
  })),
}));
vi.mock('@/lib/callables', () => callables);

const routes = [{ path: '/app', children: exchangeRoutes }];

beforeEach(() => {
  vi.clearAllMocks();
  state.reviewed = false;
});

describe('ExchangePage (S-09, FR-30/31)', () => {
  it('lets the other person confirm a proposal and shows the timeline', async () => {
    const user = userEvent.setup();
    state.exchange = exchange();
    renderRoutesWithAuth(routes, '/app/intercambios/e1', signedIn({ uid: 'laura' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Intercambio con Javier S.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Estado del intercambio' })).toBeInTheDocument();
    expect(screen.getByText('Propuesto').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('2 personas · 0 mascotas')).toBeInTheDocument();
    expect(screen.getByText('3 personas · 1 mascotas')).toBeInTheDocument();
    // Only the proposer can withdraw a proposal.
    expect(screen.queryByRole('button', { name: 'Retirar propuesta' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Confirmar intercambio' }));
    expect(callables.respondExchange).toHaveBeenCalledWith({ exchangeId: 'e1', accept: true });
  });

  it('a confirmed exchange shows the countdown, the kit and cancel with a reason', async () => {
    const user = userEvent.setup();
    state.exchange = exchange({ status: 'CONFIRMED' });
    renderRoutesWithAuth(routes, '/app/intercambios/e1', signedIn({ uid: 'laura' }));
    expect(await screen.findByText('Faltan 10 días')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar acuerdo' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Cancelar intercambio' }));
    await user.type(screen.getByRole('textbox', { name: 'Motivo (opcional)' }), 'Enfermedad');
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar' }));
    expect(callables.cancelExchange).toHaveBeenCalledWith({
      exchangeId: 'e1',
      reason: 'Enfermedad',
    });
  });

  it('a completed exchange links to the review while the window is open', async () => {
    state.exchange = exchange({
      status: 'COMPLETED',
      startDate: addDays(today, -10),
      endDate: addDays(today, -2),
      reviewDeadlineDate: addDays(today, 12),
    });
    renderRoutesWithAuth(routes, '/app/intercambios/e1', signedIn({ uid: 'laura' }));
    expect(await screen.findByRole('link', { name: 'Valorar el intercambio' })).toHaveAttribute(
      'href',
      '/app/valorar/e1',
    );
  });

  it('says when the exchange does not exist', async () => {
    state.exchange = null;
    renderRoutesWithAuth(routes, '/app/intercambios/zz', signedIn({ uid: 'laura' }));
    expect(await screen.findByText('Este intercambio no existe o no es tuyo')).toBeInTheDocument();
  });
});

describe('ReviewPage (S-10, FR-32)', () => {
  const completed = () =>
    exchange({
      status: 'COMPLETED',
      startDate: addDays(today, -10),
      endDate: addDays(today, -2),
      reviewDeadlineDate: addDays(today, 12),
    });

  it('goes overall → sub-scores → comment and explains the double blind', async () => {
    const user = userEvent.setup();
    state.exchange = completed();
    renderRoutesWithAuth(routes, '/app/valorar/e1', signedIn({ uid: 'laura' }));
    expect(await screen.findByText(/Doble ciego/)).toBeInTheDocument();
    const next = screen.getByRole('button', { name: 'Siguiente' });
    expect(next).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: '5 estrellas' }));
    await user.click(next);
    for (const group of [
      'Limpieza',
      'Fidelidad al anuncio',
      'Comunicación',
      'Cuidado de mi casa',
    ]) {
      await user.click(
        screen.getByRole('group', { name: group }).querySelectorAll('input')[3] as HTMLElement,
      );
    }
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.type(screen.getByRole('textbox', { name: 'Comentario (opcional)' }), 'Todo genial');
    await user.click(screen.getByRole('button', { name: 'Enviar valoración' }));
    await waitFor(() =>
      expect(callables.submitReview).toHaveBeenCalledWith({
        exchangeId: 'e1',
        overall: 5,
        sub: { cleanliness: 4, accuracy: 4, communication: 4, care: 4 },
        comment: 'Todo genial',
      }),
    );
    expect(
      await screen.findByText(/Se publicará cuando Javier S. también valore/),
    ).toBeInTheDocument();
  });

  it('blocks contact details in the comment (BR-22)', async () => {
    const user = userEvent.setup();
    state.exchange = completed();
    renderRoutesWithAuth(routes, '/app/valorar/e1', signedIn({ uid: 'laura' }));
    await user.click(await screen.findByRole('radio', { name: '4 estrellas' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    for (const group of [
      'Limpieza',
      'Fidelidad al anuncio',
      'Comunicación',
      'Cuidado de mi casa',
    ]) {
      await user.click(
        screen.getByRole('group', { name: group }).querySelectorAll('input')[4] as HTMLElement,
      );
    }
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Comentario (opcional)' }),
      'Llama al 612345678',
    );
    expect(screen.getByRole('button', { name: 'Enviar valoración' })).toBeDisabled();
  });

  it('explains why reviewing is not possible', async () => {
    state.exchange = completed();
    state.reviewed = true;
    renderRoutesWithAuth(routes, '/app/valorar/e1', signedIn({ uid: 'laura' }));
    expect(await screen.findByText('Ya has valorado este intercambio')).toBeInTheDocument();
    state.reviewed = false;
    state.exchange = exchange({ status: 'CONFIRMED' });
    renderRoutesWithAuth(routes, '/app/valorar/e1', signedIn({ uid: 'laura' }));
    expect(
      await screen.findByText('Podrás valorar cuando termine el intercambio'),
    ).toBeInTheDocument();
  });
});
