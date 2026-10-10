import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { discoverRoutes } from '@/features/discover/routes';
import { card } from '@/test/cards';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useReducedMotion: () => true,
}));
vi.mock('@/lib/firebase', () => ({ firebase: () => ({ db: {} }) }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), onSnapshot: vi.fn(() => () => undefined) }));
const callables = vi.hoisted(() => ({
  getDiscoverDeck: vi.fn(),
  getMyHome: vi.fn(async () => ({ home: null })),
  likeHome: vi.fn(),
  passHome: vi.fn(),
  undoPass: vi.fn(),
}));
vi.mock('@/lib/callables', () => callables);

const routes = [{ path: '/app', children: discoverRoutes }];
const eligible = () => signedIn({ canLike: true, blockers: [] });

beforeEach(() => {
  vi.clearAllMocks();
  callables.getDiscoverDeck.mockResolvedValueOnce({
    cards: [
      card('javier', {
        host: {
          displayName: 'Javier S.',
          photoUrl: null,
          identityVerified: true,
          foundingMember: false,
        },
      }),
      card('otra'),
    ],
    canLike: true,
    blockers: [],
    likesRemaining: 3,
    sponsored: null,
  });
  callables.getDiscoverDeck.mockResolvedValue({
    cards: [],
    canLike: true,
    blockers: [],
    likesRemaining: 3,
    sponsored: null,
  });
});

describe('like flow (FR-23/24)', () => {
  it('a reciprocal like opens the match celebration with a link to the chat', async () => {
    callables.likeHome.mockResolvedValue({
      matched: true,
      matchId: 'javier_laura',
      likesRemaining: 2,
    });
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/descubrir', eligible());
    await screen.findByRole('heading', { name: 'Casa javier' });
    await user.keyboard('{ArrowRight}');
    expect(
      await screen.findByRole('dialog', { name: '¡Es un match con Javier S.!' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enviar mensaje' })).toHaveAttribute(
      'href',
      '/app/chats/javier_laura',
    );
    expect(callables.likeHome).toHaveBeenCalledWith({ homeId: 'javier' });
  });

  it('a like without match moves to the next card', async () => {
    callables.likeHome.mockResolvedValue({ matched: false, matchId: null, likesRemaining: 2 });
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/descubrir', eligible());
    await screen.findByRole('heading', { name: 'Casa javier' });
    await user.click(screen.getByRole('button', { name: 'Me gusta' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Casa javier' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Casa otra' })).toBeInTheDocument();
  });

  it('the daily limit opens the Premium sheet and keeps the card (AC-23.1)', async () => {
    callables.likeHome.mockRejectedValue(
      Object.assign(new Error('x'), { details: { code: 'E_LIKE_LIMIT' } }),
    );
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/descubrir', eligible());
    await screen.findByRole('heading', { name: 'Casa javier' });
    await user.click(screen.getByRole('button', { name: 'Me gusta' }));
    expect(
      await screen.findByRole('dialog', { name: 'Sigue descubriendo sin límite' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Se renuevan a las 00:00/)).toBeInTheDocument();
    // Radix hides the page behind the sheet, but the card is still the top one.
    expect(screen.getByRole('heading', { name: 'Casa javier', hidden: true })).toBeInTheDocument();
  });
});
