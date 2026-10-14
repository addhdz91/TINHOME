import {
  BadgeCheck,
  BellRing,
  Flag,
  Home,
  LogOut,
  MapPinned,
  PauseCircle,
  Scale,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { NavigationProgress } from '@/components/NavigationProgress';
import { TinHomeLogo } from '@/components/TinHomeLogo';
import { cn } from '@/lib/utils';
import { useAdminAlerts } from '../api/use-alerts';
import { useIdleSignOut } from '../lib/use-idle-sign-out';

const NAV: {
  key: 'home' | 'alerts' | 'verifications' | 'locations' | 'reports' | 'holds' | 'appeals';
  to: string;
  icon: LucideIcon;
  end?: boolean;
}[] = [
  { key: 'home', to: '/admin', icon: Home, end: true },
  { key: 'alerts', to: '/admin/alertas', icon: BellRing },
  { key: 'verifications', to: '/admin/verificaciones', icon: BadgeCheck },
  { key: 'locations', to: '/admin/ubicaciones', icon: MapPinned },
  { key: 'reports', to: '/admin/denuncias', icon: Flag },
  { key: 'holds', to: '/admin/retenciones', icon: PauseCircle },
  { key: 'appeals', to: '/admin/recursos', icon: Scale },
];

/** Real-time badge on «Alertas» (N-26). */
function AlertsBadge() {
  const { t } = useTranslation();
  const alerts = useAdminAlerts();
  const count = alerts?.length ?? 0;
  if (count === 0) return null;
  return (
    <span className="ml-auto min-w-5 rounded-full bg-danger px-1 text-center text-xs leading-5 font-bold text-primary-foreground">
      <span aria-hidden="true">{count > 9 ? '9+' : count}</span>
      <span className="sr-only">{t('admin.alerts.unhandled', { count })}</span>
    </span>
  );
}

/** UX §9 — desktop-first admin shell with a sidebar; items of later milestones appear with them. */
export function AdminShell({ onSignOut }: { onSignOut: () => Promise<void> }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const idle = useCallback(() => {
    void onSignOut().then(() => {
      toast.info(t('admin.idle'));
      void navigate('/entrar?next=%2Fadmin', { replace: true });
    });
  }, [onSignOut, navigate, t]);
  useIdleSignOut(idle);

  return (
    <div className="min-h-dvh md:flex">
      <NavigationProgress />
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        {t('admin.skip')}
      </a>
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center gap-2 p-4">
          <TinHomeLogo variant="horizontal" height={24} />
        </div>
        <nav
          aria-label={t('admin.nav.label')}
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col"
        >
          {NAV.map(({ key, to, icon: Icon, end }) => (
            <NavLink
              key={key}
              to={to}
              end={end ?? false}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 font-semibold hover:bg-surface-muted',
                  isActive && 'bg-brand-soft text-brand-text',
                )
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              {t(`admin.nav.${key}`)}
              {key === 'alerts' ? <AlertsBadge /> : null}
            </NavLink>
          ))}
          <Link
            to="/app"
            className="flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 text-muted hover:bg-surface-muted"
          >
            <Undo2 aria-hidden="true" className="size-5" />
            {t('admin.nav.backToApp')}
          </Link>
          <button
            type="button"
            onClick={() => void onSignOut().then(() => navigate('/'))}
            className="flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 text-muted hover:bg-surface-muted"
          >
            <LogOut aria-hidden="true" className="size-5" />
            {t('admin.nav.signOut')}
          </button>
        </nav>
      </aside>
      <main id="admin-main" className="mx-auto w-full max-w-[1200px] flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
