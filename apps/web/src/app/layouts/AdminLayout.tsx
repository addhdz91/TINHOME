import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/app/auth/auth-context';
import { RouteFallback } from '@/app/RouteFallback';
import { ErrorState } from '@/components/ErrorState';
import { AdminGate } from '@/features/admin';

/** `/admin` (separate chunk): session → role + second factor (FR-48) → admin shell. */
export function AdminLayout() {
  const { t } = useTranslation();
  const { state, signOut } = useAuth();
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
  return <AdminGate user={state.user} onSignOut={signOut} />;
}
