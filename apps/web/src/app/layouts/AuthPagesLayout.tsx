import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { NavigationProgress } from '@/components/NavigationProgress';
import { TinHomeLogo } from '@/components/TinHomeLogo';

/** S-02 — calm single-column layout for sign-up, sign-in, recovery and e-mail verification. */
export function AuthPagesLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col">
      <NavigationProgress />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        {t('app.skipToContent')}
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
          <Link to="/" aria-label={t('nav.home')} className="inline-flex min-h-11 items-center">
            <TinHomeLogo variant="horizontal" height={28} decorative />
          </Link>
          <Link
            to="/ayuda"
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold hover:bg-surface-muted"
          >
            <HelpCircle aria-hidden="true" className="size-5" />
            {t('nav.help')}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
