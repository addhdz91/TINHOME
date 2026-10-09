import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router';
import { TinHomeLogo } from '@/components/TinHomeLogo';

/** Public area (landing, legal, help). Full content arrives in M1. */
export function PublicLayout() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        {t('app.skipToContent')}
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center px-4">
          <Link to="/" aria-label={t('nav.home')} className="inline-flex min-h-11 items-center">
            <TinHomeLogo variant="horizontal" height={32} decorative />
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        {t('footer.rights', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
