import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router';
import { mandatoryOnboardingStep } from '@tinhome/shared/domain';
import { useAuth } from '@/app/auth/auth-context';
import { RouteFallback } from '@/app/RouteFallback';
import { ErrorState } from '@/components/ErrorState';
import { ReacceptanceModal } from '@/features/legal';

/**
 * Signed-in area with the route guards of 02_UX_UI_SPEC.md §2.3, in order:
 * 1. no session → /entrar?next=… · 2. e-mail not verified → /verifica-email ·
 * 3. onboarding steps 2–4 pending → /app/onboarding/:step · 4. legal texts to re-accept → modal.
 */
export function AppLayout() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') return <RouteFallback />;
  if (state.status === 'signedOut') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/entrar?next=${next}`} replace />;
  }
  if (state.status === 'error') {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <ErrorState message={t('errors.E_INTERNAL')} onRetry={state.retry} />
      </main>
    );
  }
  if (state.status === 'needsProfile') return <Navigate to="/registro" replace />;

  const { me } = state;
  if (!me.verification.emailVerified) return <Navigate to="/verifica-email" replace />;

  const step = mandatoryOnboardingStep(me.onboarding.step, me.onboarding.completed);
  if (step !== null && !location.pathname.startsWith('/app/onboarding')) {
    return <Navigate to={`/app/onboarding/${String(step)}`} replace />;
  }

  return (
    <>
      <Outlet />
      {me.legalPending.length > 0 ? <ReacceptanceModal pending={me.legalPending} /> : null}
    </>
  );
}
