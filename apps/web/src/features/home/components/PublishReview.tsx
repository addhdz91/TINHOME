import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Circle, PartyPopper } from 'lucide-react';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DECLARATION_SLUG } from '@tinhome/shared/constants';
import { missingForPublish } from '@tinhome/shared/domain';
import type { HomeOwnerView } from '@tinhome/shared/schemas';
import { useAuth, useMe } from '@/app/auth/auth-context';
import { HomeCard } from '@/components/HomeCard';
import { Button } from '@/components/ui/button';
import { CityProgress, useCities, useInvite } from '@/features/cities';
import { LegalLink, useLegalVersion } from '@/features/legal';
import { toAppError, toUserMessage } from '@/lib/app-error';
import { acceptDeclaration, publishHome } from '@/lib/callables';
import { cn } from '@/lib/utils';
import { HomeStatusCard } from './HomeStatusCard';

/** S-03 step 6 — card preview, BR-03 checklist, responsible declaration and «Publicar mi casa». */
export function PublishReview({
  home,
  photosMin,
  onPublished,
}: {
  home: HomeOwnerView;
  photosMin: number;
  onPublished: (home: HomeOwnerView) => void;
}) {
  const { t } = useTranslation();
  const me = useMe();
  const { refreshMe } = useAuth();
  const cities = useCities();
  const invite = useInvite();
  const declaration = useLegalVersion(DECLARATION_SLUG);
  const [accepted, setAccepted] = useState(
    home.declarationVersion !== null &&
      home.declarationVersion === declaration.data?.currentVersion,
  );
  const [published, setPublished] = useState<HomeOwnerView | null>(
    home.status === 'PUBLISHED' ? home : null,
  );
  const city = cities.data?.find((c) => c.id === home.cityId);

  const publish = useMutation({
    mutationFn: async () => {
      const version = declaration.data?.currentVersion;
      if (version && home.declarationVersion !== version) await acceptDeclaration({ version });
      return publishHome({});
    },
    onSuccess: async (result) => {
      setPublished(result.home);
      onPublished(result.home);
      await refreshMe();
    },
  });

  if (published) {
    return (
      <div className="flex flex-col gap-4">
        <PartyPopper aria-hidden="true" className="size-10 text-brand-text" />
        <h1 className="text-h1">{t('review.successTitle')}</h1>
        <p>{published.visible ? t('review.successVisible') : t('review.successPending')}</p>
        <HomeStatusCard home={published} />
        {city && city.status !== 'OPEN' ? <CityProgress city={city} onInvite={invite} /> : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/app/mi-casa">{t('review.goHome')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const items = [
    {
      key: 'data',
      ok: missingForPublish({ ...home, photoCount: home.photos.length }, photosMin).every(
        (m) => m === 'photos',
      ),
      link: '/app/onboarding/3',
    },
    { key: 'photos', ok: home.photos.length >= photosMin, link: '/app/onboarding/3' },
    { key: 'phone', ok: me.verification.phoneVerified, link: '/app/onboarding/2' },
    { key: 'declaration', ok: accepted, link: null },
  ] as const;
  const missing = toAppError(publish.error).code === 'E_HOME_INCOMPLETE';

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">{t('review.title')}</h1>
      <div className="mx-auto w-full max-w-[320px]">
        <HomeCard
          home={{
            ...home,
            title: home.title ?? '',
            zone: home.zone ?? '',
            maxGuests: home.maxGuests ?? 1,
            bedrooms: home.bedrooms ?? 0,
            cityName: city?.name ?? '',
          }}
          eager
        />
      </div>
      <section aria-labelledby="review-checklist" className="flex flex-col gap-2">
        <h2 id="review-checklist" className="text-h3">
          {t('review.checklist')}
        </h2>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3">
              <span className={cn('flex items-center gap-2', item.ok ? 'text-text' : 'text-muted')}>
                {item.ok ? (
                  <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
                ) : (
                  <Circle aria-hidden="true" className="size-5" />
                )}
                {t(`review.items.${item.key}`, { min: photosMin })}
              </span>
              {!item.ok && item.link ? (
                <Link to={item.link} className="text-sm font-semibold text-link underline">
                  {t('review.fix')}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-5 accent-primary"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          <Trans
            i18nKey="review.declaration"
            components={{ 1: <LegalLink slug={DECLARATION_SLUG} /> }}
          />
        </span>
      </label>
      {publish.isError ? (
        <p role="alert" className="font-semibold text-danger">
          {missing ? t('errors.E_HOME_INCOMPLETE') : toUserMessage(t, publish.error)}
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <Button
          size="lg"
          className="self-start"
          disabled={!accepted || publish.isPending || !items.slice(0, 3).every((i) => i.ok)}
          onClick={() => publish.mutate()}
        >
          {publish.isPending ? t('review.publishing') : t('review.publish')}
        </Button>
        <p className="text-sm text-muted">{t('review.later')}</p>
      </div>
    </div>
  );
}
