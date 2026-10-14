import { useMutation } from '@tanstack/react-query';
import { Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { PREMIUM_PLANS, type PremiumPlan } from '@tinhome/shared/constants';
import { useAuth, useMe } from '@/app/auth/auth-context';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ReauthForm } from '@/features/auth';
import { FeatureTable, yearlySavingPercent } from '@/features/pricing';
import { usePublicConfig } from '@/hooks/use-public-config';
import { track } from '@/lib/analytics';
import { toUserMessage } from '@/lib/app-error';
import { createCheckoutSession, createPortalSession, withdrawSubscription } from '@/lib/callables';
import { formatInstant, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/** S-12 — `/app/premium`: plans and checkout, or the status of the current Premium (FR-38). */
export function PremiumPage() {
  const { t } = useTranslation();
  const me = useMe();
  const { refreshMe } = useAuth();
  const config = usePublicConfig();
  const [params, setParams] = useSearchParams();
  const [plan, setPlan] = useState<PremiumPlan>('YEARLY');
  const [accepted, setAccepted] = useState(false);

  const payment = params.get('pago');
  useEffect(() => {
    if (!payment) return;
    if (payment === 'ok') {
      // Fixed id: StrictMode runs the effect twice in development.
      toast.success(t('premium.paid'), { id: 'premium-payment' });
      void refreshMe();
    } else toast.info(t('premium.cancelled'), { id: 'premium-payment' });
    setParams({}, { replace: true });
  }, [payment, refreshMe, setParams, t]);

  const checkout = useMutation({
    mutationFn: () => {
      track('checkout_started', { plan });
      return createCheckoutSession({ plan, acceptImmediateStart: true });
    },
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });
  const portal = useMutation({
    mutationFn: () => createPortalSession({}),
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  if (config.isPending) return <Skeleton className="mt-4 h-96" />;
  if (config.isError) return <ErrorState onRetry={() => void config.refetch()} />;
  const prices = {
    MONTHLY: config.data.premiumMonthlyPriceCents,
    YEARLY: config.data.premiumYearlyPriceCents,
  };
  const saving = yearlySavingPercent(prices.MONTHLY, prices.YEARLY);
  const { premium } = me;

  return (
    <section className="flex max-w-3xl flex-col gap-6 py-4">
      <Seo title={`${t('premium.title')} — TinHome`} />
      <h1 className="flex items-center gap-2 text-h1">
        <Crown aria-hidden="true" className="size-7 text-premium" />
        {t('premium.title')}
      </h1>

      {premium.active ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
          <p className="text-h3">{t('premium.activeTitle')}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted">{t('premium.source')}</dt>
            <dd>{premium.source ? t(`admin.home.sources.${premium.source}`) : '—'}</dd>
            <dt className="text-muted">
              {premium.cancelAtPeriodEnd ? t('premium.endsOn') : t('premium.until')}
            </dt>
            <dd>{premium.until ? formatInstant(new Date(premium.until)) : '—'}</dd>
            {premium.plan ? (
              <>
                <dt className="text-muted">{t('premium.plan')}</dt>
                <dd>{t(`premium.plans.${premium.plan}`)}</dd>
              </>
            ) : null}
          </dl>
          {premium.cancelAtPeriodEnd ? (
            <p className="text-sm text-muted">{t('premium.cancelledNote')}</p>
          ) : null}
          {premium.plan ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={portal.isPending}
                onClick={() => portal.mutate()}
              >
                {t('premium.manage')}
              </Button>
              {premium.canWithdraw ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost">{t('premium.withdraw')}</Button>
                  </DialogTrigger>
                  <DialogContent
                    title={t('premium.withdrawTitle')}
                    description={t('premium.withdrawBody')}
                    closeLabel={t('common.close')}
                  >
                    <ReauthForm
                      danger
                      confirmLabel={t('premium.withdrawConfirm')}
                      action={async () => {
                        const result = await withdrawSubscription({ confirm: true });
                        toast.success(
                          t('premium.withdrawn', { amount: formatPrice(result.refundedCents) }),
                        );
                        await refreshMe();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <form
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault();
            checkout.mutate();
          }}
        >
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 font-semibold">{t('premium.choose')}</legend>
            {PREMIUM_PLANS.map((value) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-4',
                  plan === value ? 'border-primary bg-brand-soft' : 'border-border',
                )}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <input
                    type="radio"
                    name="plan"
                    value={value}
                    checked={plan === value}
                    onChange={() => setPlan(value)}
                    className="size-5 accent-primary"
                  />
                  {t(`premium.plans.${value}`)}
                </span>
                <span className="text-h2">{formatPrice(prices[value])}</span>
                <span className="text-sm text-muted">
                  {value === 'YEARLY'
                    ? t('pricing.yearlySaving', { percent: saving })
                    : t('pricing.vatIncluded')}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 size-5 accent-primary"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span className="text-sm">
              {t('premium.immediateStart', { days: config.data.withdrawalDays })}
            </span>
          </label>
          <Button
            type="submit"
            size="lg"
            variant="gradient"
            disabled={!accepted || checkout.isPending}
          >
            {checkout.isPending ? t('premium.redirecting') : t('premium.checkout')}
          </Button>
          <p className="text-xs text-muted">{t('premium.secure')}</p>
        </form>
      )}
      <FeatureTable config={config.data} />
    </section>
  );
}
