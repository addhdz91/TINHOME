import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WAITLIST_TOKEN_TTL_DAYS } from '@tinhome/shared/constants';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { DemandCounter, useActiveWindows, useCities, useTopDemand } from '@/features/cities';
import { useLegalVersion } from '@/features/legal';
import { usePublicConfig } from '@/hooks/use-public-config';
import { WaitlistForm } from '../components/WaitlistForm';

/** S-16 — public waitlist (FR-19) with live demand (FR-18). */
export function WaitlistPage() {
  const { t } = useTranslation();
  const cities = useCities();
  const windows = useActiveWindows();
  const privacy = useLegalVersion('privacidad');
  const config = usePublicConfig();
  const demand = useTopDemand();
  const [joined, setJoined] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const loading = cities.isPending || windows.isPending || privacy.isPending || config.isPending;

  let content;
  if (joined) {
    content = (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-6"
      >
        <MailCheck aria-hidden="true" className="size-8 text-success" />
        <h2 className="text-h2">{t('waitlist.success.title')}</h2>
        <p>{t('waitlist.success.body', { days: WAITLIST_TOKEN_TTL_DAYS })}</p>
        <p className="text-sm text-muted">{t('waitlist.success.spam')}</p>
        <Button
          variant="secondary"
          onClick={() => {
            setJoined(false);
            setFormKey((key) => key + 1);
          }}
        >
          {t('waitlist.success.again')}
        </Button>
      </div>
    );
  } else if (loading) {
    content = (
      <div aria-busy="true" className="flex flex-col gap-4">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-24" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  } else if (!cities.isSuccess || !windows.isSuccess || !config.isSuccess || !privacy.data) {
    // Any failed request, or no privacy text published: the visitor cannot consent yet.
    content = (
      <ErrorState
        onRetry={() => {
          void cities.refetch();
          void windows.refetch();
          void privacy.refetch();
          void config.refetch();
        }}
      />
    );
  } else if (cities.data.length < 2) {
    content = <EmptyState title={t('waitlist.noCities')} />;
  } else {
    content = (
      <WaitlistForm
        key={formKey}
        cities={cities.data}
        windows={windows.data}
        privacyVersion={privacy.data.currentVersion}
        maxDestinations={config.data.maxDestinations}
        onJoined={() => setJoined(true)}
        onPrivacyOutdated={() => void privacy.refetch()}
      />
    );
  }

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <Seo title={t('seo.waitlist.title')} description={t('seo.waitlist.description')} />
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{t('waitlist.title')}</h1>
        <p className="text-lg text-muted">{t('waitlist.intro')}</p>
      </header>
      {content}
      {demand.data && demand.data.length > 0 && cities.data && windows.data ? (
        <section aria-labelledby="waitlist-demand" className="flex flex-col gap-3">
          <h2 id="waitlist-demand" className="text-h3">
            {t('landing.demand.title')}
          </h2>
          {demand.data.map((stat) => (
            <DemandCounter key={stat.id} stat={stat} cities={cities.data} windows={windows.data} />
          ))}
        </section>
      ) : null}
    </article>
  );
}
