import { useQuery } from '@tanstack/react-query';
import { Heart, Lock, Quote } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { HomeCard as HomeCardModel } from '@tinhome/shared/schemas';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { HomeCard } from '@/components/HomeCard';
import { PaywallSheet } from '@/components/PaywallSheet';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useLikeFlow } from '@/features/match';
import { listLikesReceived } from '@/lib/callables';

function MessageLike({ card, onLike }: { card: HomeCardModel; onLike: () => void }) {
  const { t } = useTranslation();
  return (
    <li className="flex flex-col gap-3 rounded-xl bg-brand-gradient p-1">
      <div className="flex flex-col gap-3 rounded-lg bg-surface p-3">
        <Link
          to={`/app/casa/${card.homeId}`}
          aria-label={t('explore.cardLabel', {
            title: card.title,
            city: card.cityName,
            zone: card.zone,
          })}
        >
          <HomeCard home={card} />
        </Link>
        <p className="flex gap-2">
          <Quote aria-hidden="true" className="size-5 shrink-0 text-brand-text" />
          <span>
            <strong className="block">
              {t('likes.wroteYou', { name: card.host.displayName })}
            </strong>
            {`«${card.likeMessage ?? ''}»`}
          </span>
        </p>
        <Button variant="gradient" onClick={onLike}>
          <Heart aria-hidden="true" className="fill-current" />
          {t('discover.like')}
        </Button>
      </div>
    </li>
  );
}

/** S-07 — `/app/me-gusta`: free sees how many (blurred), Premium the list with quick like. */
export function LikesReceivedPage() {
  const { t } = useTranslation();
  const me = useMe();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const likeFlow = useLikeFlow();
  const likes = useQuery({
    queryKey: ['likes-received'],
    queryFn: () => listLikesReceived({ limit: 50 }),
  });
  const likeBack = async (card: HomeCardModel) => {
    if (
      await likeFlow.like({
        homeId: card.homeId,
        ownerName: card.host.displayName,
        photoUrl: card.photos[0]?.thumbUrl ?? null,
        perfectFit: card.compatibility.perfectFit,
      })
    ) {
      await likes.refetch();
    }
  };

  let content;
  if (likes.isPending) content = <Skeleton className="h-64" />;
  else if (likes.isError) content = <ErrorState onRetry={() => void likes.refetch()} />;
  else if (likes.data.count === 0) {
    content = (
      <EmptyState
        icon={<Heart />}
        title={t('likes.emptyTitle')}
        body={t('likes.emptyBody')}
        action={
          <Button asChild variant="secondary">
            <Link to="/app/mi-casa/editar">{t('likes.improve')}</Link>
          </Button>
        }
      />
    );
  } else {
    const { items, withMessage, count } = likes.data;
    const messageIds = new Set(withMessage.map((card) => card.homeId));
    content = (
      <div className="flex flex-col gap-6">
        <p className="text-h3">{t('likes.headline', { count })}</p>
        {withMessage.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {withMessage.map((card) => (
              <MessageLike key={card.homeId} card={card} onLike={() => void likeBack(card)} />
            ))}
          </ul>
        ) : null}
        {items ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((card) => !messageIds.has(card.homeId))
              .map((card) => (
                <li key={card.homeId} className="flex flex-col gap-2">
                  <Link
                    to={`/app/casa/${card.homeId}`}
                    aria-label={t('explore.cardLabel', {
                      title: card.title,
                      city: card.cityName,
                      zone: card.zone,
                    })}
                  >
                    <HomeCard home={card} />
                  </Link>
                  <Button variant="gradient" onClick={() => void likeBack(card)}>
                    <Heart aria-hidden="true" className="fill-current" />
                    {t('discover.like')}
                  </Button>
                </li>
              ))}
          </ul>
        ) : (
          <div className="relative">
            <ul
              aria-hidden="true"
              className="grid gap-4 opacity-60 blur-md sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from(
                { length: Math.min(6, Math.max(1, count - withMessage.length)) },
                (_, i) => (
                  <li key={i} className="aspect-[3/4] rounded-xl bg-brand-soft" />
                ),
              )}
            </ul>
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Button size="lg" variant="gradient" onClick={() => setPaywallOpen(true)}>
                <Lock aria-hidden="true" />
                {t('likes.seeWho')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 py-2">
      <Seo title={`${t('nav.likes')} — TinHome`} />
      <h1 className="text-h1">{t('nav.likes')}</h1>
      {me.premium.active ? null : <p className="sr-only">{t('likes.freeHint')}</p>}
      {content}
      {likeFlow.element}
      <PaywallSheet
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        title={t('paywall.whoLikedTitle')}
      />
    </section>
  );
}
