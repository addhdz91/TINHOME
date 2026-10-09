import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router';
import type { LegalDocSlug } from '@tinhome/shared/constants';
import { TinHomeLogo } from '@/components/TinHomeLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Legal links shown in the footer (FR-57); the rest are reachable from the app flows. */
const FOOTER_LEGAL = [
  'aviso-legal',
  'terminos',
  'privacidad',
  'cookies',
  'normas-comunidad',
  'info-dsa',
] as const satisfies readonly LegalDocSlug[];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex min-h-11 items-center rounded-md px-3 font-semibold hover:bg-surface-muted',
    isActive && 'text-primary',
  );

/** Public area (landing, how it works, pricing, waitlist, legal). */
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
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-2 px-4">
          <Link to="/" aria-label={t('nav.home')} className="inline-flex min-h-11 items-center">
            <TinHomeLogo variant="horizontal" height={28} decorative />
          </Link>
          <nav aria-label={t('nav.mainLabel')} className="flex items-center gap-1">
            <NavLink
              to="/como-funciona"
              className={(state) => cn(navLinkClass(state), 'hidden md:inline-flex')}
            >
              {t('nav.howItWorks')}
            </NavLink>
            <NavLink
              to="/precios"
              className={(state) => cn(navLinkClass(state), 'hidden md:inline-flex')}
            >
              {t('nav.pricing')}
            </NavLink>
            <Button asChild size="sm">
              <Link to="/lista-espera">{t('nav.joinWaitlist')}</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <TinHomeLogo variant="horizontal" height={24} />
            <p className="text-sm text-muted">{t('footer.tagline')}</p>
          </div>
          <nav aria-labelledby="footer-product" className="flex flex-col gap-1">
            <h2 id="footer-product" className="font-sans text-sm font-semibold text-muted">
              {t('footer.productTitle')}
            </h2>
            <Link to="/como-funciona" className="inline-flex min-h-11 items-center hover:underline">
              {t('nav.howItWorks')}
            </Link>
            <Link to="/precios" className="inline-flex min-h-11 items-center hover:underline">
              {t('nav.pricing')}
            </Link>
            <Link to="/lista-espera" className="inline-flex min-h-11 items-center hover:underline">
              {t('nav.waitlist')}
            </Link>
            {/* TODO(M9): point to /denunciar (FR-43); until then the DSA page holds the contact point. */}
            <Link
              to="/legal/info-dsa"
              className="inline-flex min-h-11 items-center hover:underline"
            >
              {t('footer.report')}
            </Link>
          </nav>
          <nav aria-labelledby="footer-legal" className="flex flex-col gap-1">
            <h2 id="footer-legal" className="font-sans text-sm font-semibold text-muted">
              {t('footer.legalTitle')}
            </h2>
            {FOOTER_LEGAL.map((slug) => (
              <Link
                key={slug}
                to={`/legal/${slug}`}
                className="inline-flex min-h-11 items-center hover:underline"
              >
                {t(`legal.docs.${slug}`)}
              </Link>
            ))}
          </nav>
        </div>
        <p className="pb-6 text-center text-sm text-muted">
          {t('footer.rights', { year: new Date().getFullYear() })}
        </p>
      </footer>
    </div>
  );
}
