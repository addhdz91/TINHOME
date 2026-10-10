import type { RouteObject } from 'react-router';

export const chatRoutes: RouteObject[] = [
  {
    path: 'chats',
    lazy: async () => ({ Component: (await import('./pages/ChatsLayout')).ChatsLayout }),
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('./pages/ChatsLayout')).ChatsIndex }),
      },
      {
        path: ':matchId',
        lazy: async () => ({
          Component: (await import('./pages/ConversationPage')).ConversationPage,
        }),
      },
    ],
  },
];
