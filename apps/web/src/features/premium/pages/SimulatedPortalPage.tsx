import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router';
import { toast } from 'sonner';
import { DEV_STRIPE_ACTIONS } from '@tinhome/shared/schemas';
import { useAuth } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { toUserMessage } from '@/lib/app-error';
import { devSimulateStripe } from '@/lib/callables';
import { emulatorsEnabled } from '@/lib/firebase';

/** Emulator only — stands in for the Stripe customer portal and webhooks (10_DECISIONS §5, M7). */
export function SimulatedPortalPage() {
  const { t } = useTranslation();
  const { refreshMe } = useAuth();
  const emulated = emulatorsEnabled();
  const run = useMutation({
    mutationFn: (action: (typeof DEV_STRIPE_ACTIONS)[number]) => devSimulateStripe({ action }),
    onSuccess: async () => {
      toast.success(t('premium.dev.done'));
      await refreshMe();
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  if (!emulated) return <Navigate to="/app/premium" replace />;
  return (
    <section className="flex max-w-xl flex-col gap-4 py-4">
      <h1 className="text-h1">{t('premium.dev.title')}</h1>
      <p className="text-muted">{t('premium.dev.body')}</p>
      <div className="flex flex-col gap-2">
        {DEV_STRIPE_ACTIONS.map((action) => (
          <Button
            key={action}
            variant="secondary"
            disabled={run.isPending}
            onClick={() => run.mutate(action)}
          >
            {t(`premium.dev.actions.${action}`)}
          </Button>
        ))}
      </div>
      <Link to="/app/premium" className="font-semibold text-link underline">
        {t('premium.dev.back')}
      </Link>
    </section>
  );
}
