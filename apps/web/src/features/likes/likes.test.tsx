import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { card } from '@/test/cards';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { likesRoutes } from './routes';

vi.mock('@/lib/firebase', () => ({ firebase: () => ({ db: {} }) }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), onSnapshot: vi.fn(() => () => undefined) }));
const callables = vi.hoisted(() => ({
  listLikesReceived: vi.fn(),
  getMyHome: vi.fn(async () => ({ home: null })),
  likeHome: vi.fn(),
}));
vi.mock('@/lib/callables', () => callables);

const routes = [{ path: '/app', children: likesRoutes }];

beforeEach(() => vi.clearAllMocks());

describe('LikesReceivedPage (S-07, FR-26)', () => {
  it('free users see how many, blurred cards and the likes that came with a message', async () => {
    callables.listLikesReceived.mockResolvedValue({
      count: 3,
      items: null,
      withMessage: [
        card('ana', {
          likeMessage: '¿Cambiamos en Semana Santa?',
          host: {
            displayName: 'Ana P.',
            photoUrl: null,
            identityVerified: true,
            foundingMember: false,
          },
        }),
      ],
      nextCursor: null,
    });
    renderRoutesWithAuth(routes, '/app/me-gusta', signedIn());
    expect(await screen.findByText('3 personas quieren intercambiar contigo')).toBeInTheDocument();
    expect(screen.getByText('Ana P. te ha escrito')).toBeInTheDocument();
    expect(screen.getByText('«¿Cambiamos en Semana Santa?»')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver quién te ha dado me gusta' }),
    ).toBeInTheDocument();
  });

  it('Premium users see the list with a quick like', async () => {
    callables.listLikesReceived.mockResolvedValue({
      count: 1,
      items: [card('ana')],
      withMessage: [],
      nextCursor: null,
    });
    renderRoutesWithAuth(routes, '/app/me-gusta', signedIn());
    expect(await screen.findByRole('link', { name: /Casa ana/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Me gusta' })).toBeInTheDocument();
  });

  it('shows the empty state with a tip', async () => {
    callables.listLikesReceived.mockResolvedValue({
      count: 0,
      items: null,
      withMessage: [],
      nextCursor: null,
    });
    renderRoutesWithAuth(routes, '/app/me-gusta', signedIn());
    expect(await screen.findByText('Aún nadie te ha dado me gusta')).toBeInTheDocument();
  });
});
