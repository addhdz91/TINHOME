import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CheckCircle2,
  Heart,
  Home as HomeIcon,
  Maximize,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { useMe } from '@/app/auth/auth-context';
import { BlockerSheet } from '@/components/BlockerSheet';
import { CompatibilityChips } from '@/components/CompatibilityChips';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { TrustBadges } from '@/components/TrustBadges';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useActiveWindows, useCities } from '@/features/cities';
import { toAppError, toUserMessage } from '@/lib/app-error';
import { getHomeDetail, passHome } from '@/lib/callables';
import { formatIsoDate } from '@/lib/format';

/** S-06 — `/app/casa/:homeId`: gallery, features, availability, host, reviews and actions. */
export function HomeDetailPage({ onLike }: { onLike?: (homeId: string) => Promise<boolean> }) {
  const { t } = useTranslation();
  const { homeId = '' } = useParams();
  const me = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cities = useCities();
  const windows = useActiveWindows();
  const [photo, setPhoto] = useState<number | null>(null);
  const [blockerOpen, setBlockerOpen] = useState(false);
  const detail = useQuery({
    queryKey: ['home-detail', homeId],
    queryFn: () => getHomeDetail({ homeId }),
  });
  const pass = useMutation({
    mutationFn: () => passHome({ homeId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['discover'] });
      void navigate(-1);
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  if (detail.isPending) return <Skeleton className="mt-4 h-[70vh] rounded-xl" />;
  if (detail.isError) {
    return toAppError(detail.error).code === 'E_NOT_FOUND' ? (
      <EmptyState
        headingLevel={1}
        icon={<HomeIcon />}
        title={t('detail.notFound')}
        action={
          <Button asChild>
            <Link to="/app/descubrir">{t('detail.backToDiscover')}</Link>
          </Button>
        }
        className="mt-6"
      />
    ) : (
      <ErrorState onRetry={() => void detail.refetch()} />
    );
  }
  const { home, host, reviews, relation, compatibility } = detail.data;
  const own = home.ownerUid === me.uid;
  const windowNames = new Map((windows.data ?? []).map((w) => [w.id, w.name]));
  const cityName = (id: string) => cities.data?.find((c) => c.id === id)?.name ?? id;

  const share = async () => {
    const url = `${window.location.origin}/app/casa/${home.homeId}`;
    try {
      if (typeof navigator.share === 'function') await navigator.share({ title: home.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t('detail.linkCopied'));
      }
    } catch {
      // The person closed the share sheet.
    }
  };
  const like = async () => {
    if (!me.canLike) {
      setBlockerOpen(true);
      return;
    }
    if (!onLike) {
      toast.info(t('discover.likeSoon'));
      return;
    }
    if (await onLike(home.homeId)) await detail.refetch();
  };

  return (
    <article className="flex flex-col gap-6 pb-28">
      <Seo title={`${home.title} — TinHome`} />
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          className="inline-flex min-h-11 items-center gap-2 font-semibold"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          {t('common.back')}
        </button>
        <Button variant="ghost" onClick={() => void share()}>
          <Share2 aria-hidden="true" />
          {t('detail.share')}
        </Button>
      </div>

      <ul
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4"
        aria-label={t('detail.gallery')}
      >
        {home.photos.map((p, i) => (
          <li key={p.cardUrl} className="w-[85%] shrink-0 snap-center sm:w-[60%] lg:w-[45%]">
            <button
              type="button"
              className="block w-full overflow-hidden rounded-xl"
              onClick={() => setPhoto(i)}
            >
              <img
                src={p.cardUrl}
                alt={t('home.photos.alt', {
                  n: i + 1,
                  total: home.photos.length,
                  title: home.title,
                })}
                width={p.width}
                height={p.height}
                loading={i < 2 ? 'eager' : 'lazy'}
                className="aspect-[4/5] w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{home.title}</h1>
        <p className="text-muted">{`${home.cityName} · ${home.zone}`}</p>
        <TrustBadges
          verified={host.identityVerified}
          top={home.isTop}
          founder={host.foundingMember}
          rating={home.rating}
        />
        <CompatibilityChips
          compatibility={compatibility}
          viewerCityName={me.city?.name ?? ''}
          windowNames={windowNames}
          petsAllowed={home.petsAllowed}
          max={6}
        />
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label={t('detail.features')}>
        <li className="flex items-center gap-2">
          <Users aria-hidden="true" className="size-5" />
          {t('home.preview.guests', { count: home.maxGuests })}
        </li>
        <li className="flex items-center gap-2">
          <BedDouble aria-hidden="true" className="size-5" />
          {t('home.preview.bedrooms', { count: home.bedrooms })}
        </li>
        <li className="flex items-center gap-2">
          <BedDouble aria-hidden="true" className="size-5" />
          {t('detail.beds', { count: home.beds })}
        </li>
        <li className="flex items-center gap-2">
          <Bath aria-hidden="true" className="size-5" />
          {t('detail.bathrooms', { count: home.bathrooms })}
        </li>
        <li className="flex items-center gap-2">
          <Maximize aria-hidden="true" className="size-5" />
          {t('detail.size', { size: home.sizeM2 })}
        </li>
      </ul>

      <p className="whitespace-pre-line">{home.description}</p>

      <section aria-labelledby="availability" className="flex flex-col gap-2">
        <h2 id="availability" className="text-h3">
          {t('detail.availability')}
        </h2>
        {home.availability &&
        (home.availability.windowIds.length > 0 || home.availability.ranges.length > 0) ? (
          <ul className="flex flex-wrap gap-2">
            {home.availability.windowIds.map((id) => (
              <li key={id} className="rounded-full bg-surface-muted px-3 py-1 text-sm">
                {windowNames.get(id) ?? id}
              </li>
            ))}
            {home.availability.ranges.map((range) => (
              <li
                key={`${range.start}-${range.end}`}
                className="rounded-full bg-surface-muted px-3 py-1 text-sm"
              >
                {`${formatIsoDate(range.start)} – ${formatIsoDate(range.end)}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">{t('detail.noAvailability')}</p>
        )}
        {home.destinations ? (
          <p>
            {home.destinations.mode === 'ANY_OPEN'
              ? t('detail.wantsAny')
              : t('detail.wants', { cities: home.destinations.cityIds.map(cityName).join(', ') })}
          </p>
        ) : null}
      </section>

      {home.amenities.length > 0 ? (
        <section aria-labelledby="amenities" className="flex flex-col gap-2">
          <h2 id="amenities" className="text-h3">
            {t('home.fields.amenities')}
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {home.amenities.map((amenity) => (
              <li key={amenity} className="flex items-center gap-2">
                <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
                {t(`home.amenities.${amenity}`)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {home.houseRules ? (
        <section aria-labelledby="rules" className="flex flex-col gap-2">
          <h2 id="rules" className="text-h3">
            {t('home.fields.houseRules')}
          </h2>
          <p className="whitespace-pre-line">{home.houseRules}</p>
        </section>
      ) : null}

      <section
        aria-labelledby="host"
        className="flex flex-col gap-2 rounded-lg border border-border p-4"
      >
        <h2 id="host" className="text-h3">
          {t('detail.host', { name: host.displayName })}
        </h2>
        <TrustBadges
          verified={host.identityVerified}
          top={host.isTopHost}
          founder={host.foundingMember}
          rating={null}
        />
        {host.about ? <p>{host.about}</p> : null}
        {host.languages.length > 0 ? (
          <p className="text-sm text-muted">
            {t('detail.languages', { languages: host.languages.join(', ') })}
          </p>
        ) : null}
        {host.memberSince ? (
          <p className="text-sm text-muted">
            {t('detail.memberSince', {
              date: new Date(host.memberSince).toLocaleDateString('es-ES', {
                month: 'long',
                year: 'numeric',
              }),
            })}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="reviews" className="flex flex-col gap-2">
        <h2 id="reviews" className="text-h3">
          {t('detail.reviews')}
        </h2>
        {reviews.length === 0 ? (
          <p className="text-muted">{t('detail.noReviews')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-md border border-border p-3">
                <p className="font-semibold">
                  {t('detail.reviewBy', { name: review.authorDisplayName, score: review.overall })}
                </p>
                {review.comment ? <p>{review.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {own ? null : (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface p-3 lg:bottom-0 lg:left-64">
          <div className="mx-auto flex max-w-xl gap-3">
            {relation.matchId ? (
              <Button asChild size="lg" className="flex-1">
                <Link to={`/app/chats/${relation.matchId}`}>{t('detail.match')}</Link>
              </Button>
            ) : relation.liked ? (
              <p className="flex flex-1 items-center justify-center gap-2 font-semibold">
                <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
                {t('detail.liked')}
              </p>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  disabled={pass.isPending || relation.passed}
                  onClick={() => pass.mutate()}
                >
                  <X aria-hidden="true" />
                  {relation.passed ? t('detail.passed') : t('discover.pass')}
                </Button>
                <Button variant="gradient" size="lg" className="flex-1" onClick={() => void like()}>
                  <Heart aria-hidden="true" className="fill-current" />
                  {t('discover.like')}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <Dialog open={photo !== null} onOpenChange={(open) => setPhoto(open ? photo : null)}>
        <DialogContent title={home.title} closeLabel={t('common.close')} className="sm:max-w-3xl">
          {photo !== null && home.photos[photo] ? (
            <img
              src={home.photos[photo].fullUrl}
              alt={t('home.photos.alt', {
                n: photo + 1,
                total: home.photos.length,
                title: home.title,
              })}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          ) : null}
          <div className="flex justify-between">
            <Button
              variant="secondary"
              disabled={!photo}
              onClick={() => setPhoto((p) => Math.max(0, (p ?? 0) - 1))}
            >
              {t('detail.prevPhoto')}
            </Button>
            <Button
              variant="secondary"
              disabled={photo === home.photos.length - 1}
              onClick={() => setPhoto((p) => Math.min(home.photos.length - 1, (p ?? 0) + 1))}
            >
              {t('detail.nextPhoto')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <BlockerSheet open={blockerOpen} onOpenChange={setBlockerOpen} blockers={me.blockers} />
    </article>
  );
}
