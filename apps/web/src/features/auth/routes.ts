import type { RouteObject } from 'react-router';

export const authRoutes: RouteObject[] = [
  {
    path: 'registro',
    lazy: async () => ({ Component: (await import('./pages/RegisterPage')).RegisterPage }),
  },
  {
    path: 'entrar',
    lazy: async () => ({ Component: (await import('./pages/SignInPage')).SignInPage }),
  },
  {
    path: 'recuperar',
    lazy: async () => ({ Component: (await import('./pages/RecoverPage')).RecoverPage }),
  },
  {
    path: 'verifica-email',
    lazy: async () => ({ Component: (await import('./pages/VerifyEmailPage')).VerifyEmailPage }),
  },
  {
    path: 'i/:code',
    lazy: async () => ({ Component: (await import('./pages/InvitePage')).InvitePage }),
  },
];
