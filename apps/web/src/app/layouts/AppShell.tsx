import {
  Heart,
  HelpCircle,
  Home,
  MessageCircleHeart,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  type LucideIcon,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router';
import { useMe } from '@/app/auth/auth-context';
import { NavigationProgress } from '@/components/NavigationProgress';
import { TinHomeLogo } from '@/components/TinHomeLogo';
import { cn } from '@/lib/utils';

// Only founding members ever load it (FR-40), so it stays out of the shell chunk.
const FounderWelcome = lazy(async () => ({
  default: (await import('@/features/verification/components/FounderWelcome')).FounderWelcome,
}));

type NavKey = 'discover' | 'explore' | 'likes' | 'chats' | 'profile';

/** Desktop sidebar extras (02_UX §2.1). */
const EXTRA: { key: 'myHome' | 'trip' | 'verification'; to: string; icon: LucideIcon }[] = [
  { key: 'myHome', to: '/app/mi-casa', icon: Home },
  { key: 'trip', to: '/app/viaje', icon: Plane },
  { key: 'verification', to: '/app/verificacion', icon: ShieldCheck },
];

const TABS: { key: NavKey; to: string; icon: LucideIcon }[] = [
  { key: 'discover', to: '/app/descubrir', icon: Sparkles },
  { key: 'explore', to: '/app/explorar', icon: Search },
  { key: 'likes', to: '/app/me-gusta', icon: Heart },
  { key: 'chats', to: '/app/chats', icon: MessageCircleHeart },
  { key: 'profile', to: '/app/perfil', icon: User },
];

/**
 * C-01 — mobile: header + fixed bottom bar with 5 tabs (safe areas); desktop (≥ 1024 px):
 * left sidebar and centred content (max 1200 px). Badges arrive with their features.
 */
export function AppShell() {
  const { t } = useTranslation();
  const me = useMe();
  return (
    <div className="min-h-dvh lg:flex">
      <NavigationProgress />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        {t('app.skipToContent')}
      </a>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <Link
          to="/app/descubrir"
          aria-label={t('nav.discover')}
          className="inline-flex min-h-11 items-center"
        >
          <TinHomeLogo variant="symbol" height={32} decorative />
        </Link>
        <Link
          to="/ayuda"
          aria-label={t('nav.help')}
          className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-muted"
        >
          <HelpCircle aria-hidden="true" className="size-6" />
        </Link>
      </header>

      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:flex-col lg:gap-6 lg:border-r lg:border-border lg:bg-surface lg:p-5">
        <Link
          to="/app/descubrir"
          aria-label={t('nav.discover')}
          className="inline-flex min-h-11 items-center"
        >
          <TinHomeLogo variant="horizontal" height={32} decorative />
        </Link>
        <nav aria-label={t('nav.appLabel')} className="flex flex-col gap-1">
          {[...TABS, ...EXTRA].map(({ key, to, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold hover:bg-surface-muted',
                  isActive && 'bg-brand-soft text-brand-text',
                )
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/ayuda"
          className="mt-auto flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold hover:bg-surface-muted"
        >
          <HelpCircle aria-hidden="true" className="size-5" />
          {t('nav.help')}
        </Link>
      </aside>

      <main
        id="main"
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8"
      >
        <Outlet />
        {me.foundingMember ? (
          <Suspense fallback={null}>
            <FounderWelcome />
          </Suspense>
        ) : null}
      </main>

      <nav
        aria-label={t('nav.appLabel')}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {TABS.map(({ key, to, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-caption font-semibold text-muted',
                isActive && 'text-primary',
              )
            }
          >
            <Icon aria-hidden="true" className="size-6" />
            {t(`nav.${key}`)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
