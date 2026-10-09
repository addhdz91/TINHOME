import { PartyPopper, Share2, TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { CityProgress, useCities, useInvite } from '@/features/cities';
import { formatNumber } from '@/lib/format';
import { useConfirmWaitlist } from '../api/use-waitlist';

/** `/lista-espera/confirmar?token=…` — double opt-in landing page (FR-19, E2E-01). */
export function WaitlistConfirmPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token');
  const confirm = useConfirmWaitlist();
  const cities = useCities();
  const invite = useInvite();
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    confirm.mutate({ token });
    // The token must not stay in the address bar, history or shared screenshots.
    window.history.replaceState(null, '', window.location.pathname);
  }, [token, confirm]);

  const invalid = (
    <EmptyState
      icon={<TriangleAlert />}
      title={t('waitlist.confirm.invalidTitle')}
      headingLevel={1}
      body={token ? t('waitlist.confirm.invalidBody') : t('waitlist.confirm.missingToken')}
      action={
        <Button asChild>
          <Link to="/lista-espera">{t('waitlist.confirm.again')}</Link>
        </Button>
      }
    />
  );

  let content;
  if (!token && !confirm.data) {
    content = invalid;
  } else if (confirm.isError) {
    content = invalid;
  } else if (!confirm.data) {
    content = (
      <div aria-busy="true" role="status" className="flex flex-col gap-3">
        <p>{t('waitlist.confirm.loading')}</p>
        <Skeleton className="h-36" />
      </div>
    );
  } else {
    const city = cities.data?.find((c) => c.id === confirm.data.cityId);
    content = (
      <div className="flex flex-col gap-5">
        <div role="status" className="flex flex-col gap-2">
          <PartyPopper aria-hidden="true" className="size-8 text-brand-text" />
          <h1 className="text-h1">{t('waitlist.confirm.title')}</h1>
          {city && confirm.data.position ? (
            <p className="text-lg">
              {t('waitlist.confirm.position', {
                position: formatNumber(confirm.data.position),
                city: city.name,
              })}
            </p>
          ) : null}
          {city ? (
            <p className="text-muted">{t('waitlist.confirm.body', { city: city.name })}</p>
          ) : null}
        </div>
        {cities.isPending ? (
          <Skeleton className="h-36" />
        ) : city ? (
          <CityProgress city={city} />
        ) : null}
        <Button variant="secondary" className="self-start" onClick={invite}>
          <Share2 aria-hidden="true" />
          {t('waitlist.confirm.share')}
        </Button>
      </div>
    );
  }

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <Seo title={t('seo.waitlist.title')} />
      {content}
    </article>
  );
}
