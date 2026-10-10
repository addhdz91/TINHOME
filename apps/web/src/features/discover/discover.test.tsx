import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeCard } from '@tinhome/shared/schemas';
import { card } from '@/test/cards';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { discoverRoutes } from './routes';

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useReducedMotion: () => true,
}));
const callables = vi.hoisted(() => ({
  getDiscoverDeck: vi.fn(),
  passHome: vi.fn(async () => ({ ok: true })),
  undoPass: vi.fn(async (_input: { homeId: string; sessionId: string }) => ({ ok: true })),
}));
vi.mock('@/lib/callables', () => callables);

const deck = (cards: HomeCard[], canLike = false) => ({
  cards,
  canLike,
  blockers: canLike ? [] : ['IDENTITY_MISSING'],
  likesRemaining: 10,
  sponsored: null,
});

const routes = [{ path: '/app', children: discoverRoutes }];

beforeEach(() => {
  vi.clearAllMocks();
  callables.getDiscoverDeck.mockResolvedValueOnce(
    deck([
      card('a', {
        compatibility: {
          perfectFit: true,
          mutualDestination: true,
          wantsYourCity: true,
          sharedWindowIds: [],
          overlapDays: 3,
          petsOk: true,
          capacityOk: true,
        },
      }),
      card('b'),
    ]),
  );
  callables.getDiscoverDeck.mockResolvedValue(deck([]));
});

describe('DiscoverPage (S-04, FR-20)', () => {
  it('shows the first card with its compatibility chips and the likes counter', async () => {
    renderRoutesWithAuth(routes, '/app/descubrir', signedIn());
    expect(await screen.findByRole('heading', { name: 'Casa a' })).toBeInTheDocument();
    expect(screen.getByText('Encaje perfecto')).toBeInTheDocument();
    expect(screen.getByText('Te quedan 10 me gusta hoy')).toBeInTheDocument();
  });

  it('passes with ← (keyboard) and undoes with Z', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/descubrir', signedIn());
    await screen.findByRole('heading', { name: 'Casa a' });
    await user.keyboard('{ArrowLeft}');
    expect(await screen.findByRole('heading', { name: 'Casa b' })).toBeInTheDocument();
    expect(callables.passHome).toHaveBeenCalledWith({ homeId: 'a' });
    await user.keyboard('z');
    expect(await screen.findByRole('heading', { name: 'Casa a' })).toBeInTheDocument();
    expect(callables.undoPass.mock.calls[0]?.[0]).toMatchObject({ homeId: 'a' });
  });

  it('opens the BlockerSheet when the user cannot like yet (AC-20.1)', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/descubrir', signedIn());
    await screen.findByRole('heading', { name: 'Casa a' });
    await user.click(screen.getByRole('button', { name: 'Me gusta' }));
    expect(
      await screen.findByRole('dialog', { name: 'Antes de dar me gusta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verificar identidad' })).toHaveAttribute(
      'href',
      '/app/verificacion',
    );
  });

  it('offers useful actions when the deck is empty (AC-20.2)', async () => {
    callables.getDiscoverDeck.mockReset();
    callables.getDiscoverDeck.mockResolvedValue(deck([]));
    renderRoutesWithAuth(routes, '/app/descubrir', signedIn());
    expect(
      await screen.findByRole('heading', { name: 'Has visto todas las casas que encajan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invitar a alguien' })).toBeInTheDocument();
  });

  it('shows the Premium sheet after the free undo is used (AC-20.3)', async () => {
    const user = userEvent.setup();
    callables.undoPass.mockRejectedValueOnce(
      Object.assign(new Error('x'), { details: { code: 'E_UNDO_LIMIT' } }),
    );
    renderRoutesWithAuth(routes, '/app/descubrir', signedIn());
    await screen.findByRole('heading', { name: 'Casa a' });
    await user.click(screen.getByRole('button', { name: 'Paso' }));
    await screen.findByRole('heading', { name: 'Casa b' });
    await user.click(screen.getByRole('button', { name: 'Deshacer el último paso' }));
    expect(
      await screen.findByRole('dialog', { name: 'Deshaz todas las veces que quieras' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(callables.undoPass).toHaveBeenCalled());
  });
});
