import type { User } from 'firebase/auth';
import { ShieldOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { RouteFallback } from '@/app/RouteFallback';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { useAdminClaims } from '../lib/claims';
import { AdminShell } from './AdminShell';
import { MfaSetup } from './MfaSetup';

/** FR-48 — admin role and a second factor in this session, otherwise nothing of /admin loads. */
export function AdminGate({ user, onSignOut }: { user: User; onSignOut: () => Promise<void> }) {
  const { t } = useTranslation();
  const claims = useAdminClaims(user);
  if (claims.isPending) return <RouteFallback />;
  if (claims.isError) return <ErrorState onRetry={() => void claims.refetch()} />;
  if (!claims.data.role) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <EmptyState
          headingLevel={1}
          icon={<ShieldOff />}
          title={t('admin.denied.title')}
          body={t('admin.denied.body')}
          action={
            <Button asChild>
              <Link to="/app">{t('admin.denied.back')}</Link>
            </Button>
          }
        />
      </main>
    );
  }
  if (!claims.data.secondFactor) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <MfaSetup user={user} onSignOut={() => void onSignOut()} />
      </main>
    );
  }
  return <AdminShell onSignOut={onSignOut} />;
}
