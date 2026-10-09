import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/hooks/use-public-config';
import { formatPrice } from '@/lib/format';
import { FeatureTable } from '../components/FeatureTable';
import { yearlySavingPercent } from '../lib/pricing';

/** `/precios` — prices from `config/public` (P-21/P-22, VAT included, TODO(DEC-75)). */
export function PricingPage() {
  const { t } = useTranslation();
  const config = usePublicConfig();
  const notes = t('pricing.notes', {
    returnObjects: true,
    days: config.data?.withdrawalDays ?? 14,
  });

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
      <Seo title={t('seo.pricing.title')} description={t('seo.pricing.description')} />
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{t('pricing.title')}</h1>
        <p className="text-lg text-muted">{t('pricing.subtitle')}</p>
      </header>

      {config.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-80" />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : config.isError ? (
        <ErrorState onRetry={() => void config.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <section
              aria-labelledby="plan-free"
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5"
            >
              <h2 id="plan-free" className="text-h3">
                {t('pricing.free')}
              </h2>
              <p className="font-display text-h1 font-extrabold">{t('pricing.freePrice')}</p>
            </section>
            <section
              aria-labelledby="plan-premium"
              className="flex flex-col gap-2 rounded-lg border-2 border-brand bg-surface p-5"
            >
              <h2 id="plan-premium" className="text-h3 text-brand-text">
                {t('pricing.premium')}
              </h2>
              <p className="font-display text-h1 font-extrabold">
                {t('pricing.monthly', { price: formatPrice(config.data.premiumMonthlyPriceCents) })}
              </p>
              <p className="text-muted">
                {t('pricing.yearly', { price: formatPrice(config.data.premiumYearlyPriceCents) })} ·{' '}
                {t('pricing.vatIncluded')}
              </p>
              <p className="text-sm font-semibold text-success">
                {t('pricing.yearlySaving', {
                  percent: yearlySavingPercent(
                    config.data.premiumMonthlyPriceCents,
                    config.data.premiumYearlyPriceCents,
                  ),
                })}
              </p>
            </section>
          </div>
          <FeatureTable config={config.data} />
        </>
      )}

      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <Button asChild size="lg" className="self-start">
        <Link to="/lista-espera">{t('pricing.cta')}</Link>
      </Button>
    </article>
  );
}
