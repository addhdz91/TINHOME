import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoutesWithAuth } from '@/test/render';
import { signedIn } from '@/test/session';
import type { NotificationItem } from './api/use-notifications';
import { NotificationSettings } from './components/NotificationSettings';
import { notificationRoutes } from './routes';

const state = vi.hoisted(() => ({ items: [] as NotificationItem[] }));
const markRead = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('./api/use-notifications', () => ({
  useNotifications: () => ({ status: 'ready', data: state.items }),
  useUnreadNotifications: () => state.items.filter((i) => !i.read).length,
  markNotificationRead: markRead,
}));
vi.mock('./lib/push', () => ({
  pushState: vi.fn(async () => 'default'),
  enablePush: vi.fn(async () => 'granted'),
  disablePush: vi.fn(async () => undefined),
  refreshPushToken: vi.fn(async () => undefined),
}));
const callables = vi.hoisted(() => ({
  markAllNotificationsRead: vi.fn(async () => ({ updated: 1 })),
  updateSettings: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/callables', () => callables);

const item = (id: string, read: boolean): NotificationItem => ({
  id,
  type: 'N-08',
  title: `Aviso ${id}`,
  body: 'Intercambio del 20 al 28 de marzo.',
  link: `/app/intercambios/${id}`,
  createdAt: new Date('2027-03-01T10:00:00Z'),
  read,
});

const routes = [{ path: '/app', children: notificationRoutes }];

beforeEach(() => vi.clearAllMocks());

describe('NotificationsPage (FR-46)', () => {
  it('lists notices, marks one as read when opened and all at once', async () => {
    const user = userEvent.setup();
    state.items = [item('a', false), item('b', true)];
    renderRoutesWithAuth(routes, '/app/avisos', signedIn({ uid: 'laura' }));
    const unread = await screen.findByRole('link', { name: /Sin leer:\s*Aviso a/ });
    expect(unread).toHaveAttribute('href', '/app/intercambios/a');
    expect(screen.getByRole('link', { name: /^Aviso b/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Marcar todo como leído' }));
    expect(callables.markAllNotificationsRead).toHaveBeenCalled();
    await user.click(unread);
    expect(markRead).toHaveBeenCalledWith('laura', 'a');
  });

  it('shows the empty state', async () => {
    state.items = [];
    renderRoutesWithAuth(routes, '/app/avisos', signedIn());
    expect(await screen.findByText('No tienes avisos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar todo como leído' })).toBeNull();
  });
});

describe('NotificationSettings (FR-46, FR-70)', () => {
  it('toggles a channel, keeps service notices mandatory and offers push for this device', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth([{ path: '/', element: <NotificationSettings /> }], '/', signedIn());
    const pushMessages = screen.getByRole('checkbox', { name: 'Mensajes por Móvil' });
    expect(pushMessages).toBeChecked();
    await user.click(pushMessages);
    await waitFor(() =>
      expect(callables.updateSettings).toHaveBeenCalledWith(
        { notifications: { MESSAGES: { push: false } } },
        expect.anything(),
      ),
    );
    expect(screen.queryByRole('checkbox', { name: /Servicio|Legal/ })).toBeNull();
    expect(screen.getByText(/se envían siempre/)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Mostrar el texto de los mensajes en las notificaciones',
      }),
    ).not.toBeChecked();
    expect(
      await screen.findByRole('button', { name: 'Activar notificaciones' }),
    ).toBeInTheDocument();
  });

  it('commercial e-mails are a separate switch, off by default (FR-46, LSSI art. 21)', async () => {
    const user = userEvent.setup();
    renderRoutesWithAuth([{ path: '/', element: <NotificationSettings /> }], '/', signedIn());
    const marketing = screen.getByRole('checkbox', { name: /Quiero recibir por email ofertas/ });
    expect(marketing).not.toBeChecked();
    expect(screen.getByText(/Por defecto está desactivado/)).toBeInTheDocument();
    await user.click(marketing);
    await waitFor(() =>
      expect(callables.updateSettings).toHaveBeenCalledWith(
        { marketingOptIn: true },
        expect.anything(),
      ),
    );
  });
});
