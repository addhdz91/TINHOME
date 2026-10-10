import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { card } from '@/test/cards';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import { exploreRoutes } from './routes';

const callables = vi.hoisted(() => ({ searchHomes: vi.fn() }));
vi.mock('@/lib/callables', () => callables);

const routes = [{ path: '/app', children: exploreRoutes }];

beforeEach(() => {
  vi.clearAllMocks();
  callables.searchHomes.mockResolvedValue({ items: [card('a'), card('b')], nextCursor: null });
});

describe('ExplorePage (S-05, FR-21)', () => {
  it('lists homes linking to their detail and filters by pets', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/explorar', signedIn());
    expect(await screen.findByRole('link', { name: /Casa a/ })).toHaveAttribute(
      'href',
      '/app/casa/a',
    );
    await user.click(screen.getByRole('button', { name: 'Mascotas' }));
    await waitFor(() =>
      expect(callables.searchHomes.mock.calls.at(-1)?.[0]).toMatchObject({
        filters: { pets: true },
      }),
    );
  });

  it('locks Premium filters and the Top collection for free users', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth(routes, '/app/explorar', signedIn());
    await user.click(await screen.findByRole('button', { name: /Las Casas Top son para Premium/ }));
    expect(
      await screen.findByRole('dialog', { name: 'Encuentra antes tu intercambio' }),
    ).toBeInTheDocument();
  });

  it('shows the empty state with «Quitar filtros»', async () => {
    callables.searchHomes.mockResolvedValue({ items: [], nextCursor: null });
    renderRoutesWithAuth(routes, '/app/explorar', signedIn());
    expect(await screen.findByText('No hay casas con estos filtros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar filtros' })).toBeInTheDocument();
  });
});
