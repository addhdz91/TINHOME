import { useMutation } from '@tanstack/react-query';
import { Compass } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { HomeCard } from '@tinhome/shared/schemas';
import { useMe } from '@/app/auth/auth-context';
import { BlockerSheet } from '@/components/BlockerSheet';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PaywallSheet } from '@/components/PaywallSheet';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useActiveWindows, useCities, useInvite } from '@/features/cities';
import { toAppError, toUserMessage } from '@/lib/app-error';
import { passHome, undoPass } from '@/lib/callables';
import { useDeck } from '../api/use-deck';
import { ActionBar } from '../components/ActionBar';
import { SwipeDeck, type SwipeDirection } from '../components/SwipeDeck';
import { appSessionId } from '../lib/session';

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * S-04 — `/app/descubrir`. The like itself (FR-23) arrives in M6; until then an eligible user
 * gets a notice and an ineligible one the BlockerSheet (AC-20.1).
 */
export function DiscoverPage({ onLike }: { onLike?: (card: HomeCard) => Promise<boolean> }) {
  const { t } = useTranslation();
  const me = useMe();
  const navigate = useNavigate();
  const invite = useInvite();
  const cities = useCities();
  const windows = useActiveWindows();
  const [destination, setDestination] = useState<string>('');
  const deck = useDeck(destination ? { destinationCityIds: [destination] } : {});
  const [consumed, setConsumed] = useState<string[]>([]);
  const [lastPassed, setLastPassed] = useState<HomeCard | null>(null);
  const [command, setCommand] = useState<{ direction: SwipeDirection; nonce: number } | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [paywall, setPaywall] = useState<'undo' | 'likes' | null>(null);

  const allCards = useMemo(() => deck.data?.pages.flatMap((page) => page.cards) ?? [], [deck.data]);
  const remaining = allCards.filter((card) => !consumed.includes(card.homeId));
  const first = deck.data?.pages[0];
  const top = remaining[0];
  const windowNames = useMemo(
    () => new Map((windows.data ?? []).map((w) => [w.id, w.name])),
    [windows.data],
  );
  const viewerCityName = me.city?.name ?? '';

  // Fetch the next batch before the deck runs out.
  useEffect(() => {
    if (remaining.length < 5 && deck.hasNextPage && !deck.isFetchingNextPage)
      void deck.fetchNextPage();
  }, [remaining.length, deck]);

  const pass = useMutation({ mutationFn: (card: HomeCard) => passHome({ homeId: card.homeId }) });
  const undo = useMutation({
    mutationFn: (card: HomeCard) => undoPass({ homeId: card.homeId, sessionId: appSessionId() }),
    onSuccess: (_, card) => {
      setConsumed((list) => list.filter((id) => id !== card.homeId));
      setLastPassed(null);
    },
    onError: (error) => {
      if (toAppError(error).code === 'E_UNDO_LIMIT') setPaywall('undo');
      else toast.error(toUserMessage(t, error));
    },
  });

  const handleSwipe = (card: HomeCard, direction: SwipeDirection) => {
    if (direction === 'pass') {
      setConsumed((list) => [...list, card.homeId]);
      setLastPassed(card);
      setAnnouncement(t('discover.passed', { title: card.title }));
      pass.mutate(card, {
        onError: (error) => {
          // The gesture is reverted (S-04 network error state).
          setConsumed((list) => list.filter((id) => id !== card.homeId));
          toast.error(toUserMessage(t, error));
        },
      });
      return;
    }
    void (async () => {
      if (!first?.canLike) {
        setBlockerOpen(true);
        return;
      }
      if (!onLike) {
        toast.info(t('discover.likeSoon'));
        return;
      }
      if (await onLike(card)) {
        setConsumed((list) => [...list, card.homeId]);
        setAnnouncement(t('discover.liked', { title: card.title }));
      }
    })();
  };

  const requestSwipe = (direction: SwipeDirection) => {
    if (!top) return;
    if (direction === 'like' && !first?.canLike) {
      setBlockerOpen(true);
      return;
    }
    setCommand({ direction, nonce: Date.now() });
  };

  const openDetail = (card: HomeCard) => void navigate(`/app/casa/${card.homeId}`);
  const doUndo = () => {
    if (lastPassed) undo.mutate(lastPassed);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'ArrowLeft') requestSwipe('pass');
      else if (event.key === 'ArrowRight') requestSwipe('like');
      else if (event.key === 'ArrowUp' && top) {
        event.preventDefault();
        openDetail(top);
      } else if (event.key.toLowerCase() === 'z') doUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const destinations = (cities.data ?? []).filter(
    (city) => city.status === 'OPEN' && city.id !== me.city?.id,
  );

  let content;
  if (deck.isPending)
    content = <Skeleton className="mx-auto aspect-[3/4] w-full max-w-sm rounded-xl" />;
  else if (deck.isError) content = <ErrorState onRetry={() => void deck.refetch()} />;
  else if (!top) {
    content = (
      <EmptyState
        headingLevel={2}
        icon={<Compass />}
        title={t('discover.emptyTitle')}
        body={t('discover.emptyBody')}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="secondary">
              <Link to="/app/viaje">{t('discover.widen')}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/app/viaje">{t('discover.addDates')}</Link>
            </Button>
            <Button onClick={invite}>{t('discover.invite')}</Button>
          </div>
        }
      />
    );
  } else {
    content = (
      <div className="flex flex-col gap-5">
        <SwipeDeck
          cards={remaining}
          viewerCityName={viewerCityName}
          windowNames={windowNames}
          onSwipe={handleSwipe}
          onOpen={openDetail}
          command={command}
        />
        <ActionBar
          onUndo={doUndo}
          onPass={() => requestSwipe('pass')}
          onOpen={() => openDetail(top)}
          onLike={() => requestSwipe('like')}
          canUndo={lastPassed !== null && !undo.isPending}
          disabled={false}
        />
        {first?.likesRemaining !== null && first?.likesRemaining !== undefined ? (
          <p className="text-center text-sm text-muted">
            {t('discover.likesLeft', { count: first.likesRemaining })}
          </p>
        ) : null}
        <p className="hidden text-center text-sm text-muted lg:block">{t('discover.shortcuts')}</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 py-2">
      <Seo title={`${t('nav.discover')} — TinHome`} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1">{t('nav.discover')}</h1>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <span>{t('discover.to')}</span>
          <select
            value={destination}
            onChange={(event) => {
              setDestination(event.target.value);
              setConsumed([]);
              setLastPassed(null);
            }}
            className="min-h-11 rounded-full border border-border bg-surface px-3 text-text"
          >
            <option value="">{t('discover.myDestinations')}</option>
            {destinations.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {me.city?.status === 'WAITLIST' ? (
        <p role="status" className="rounded-md bg-brand-soft p-3 text-brand-text">
          {t('discover.cityWaitlist')}
        </p>
      ) : null}
      {content}
      <p aria-live="polite" className="sr-only">
        {[announcement, top ? t('discover.current', { title: top.title, city: top.cityName }) : '']
          .filter(Boolean)
          .join('. ')}
      </p>
      <BlockerSheet
        open={blockerOpen}
        onOpenChange={setBlockerOpen}
        blockers={first?.blockers ?? me.blockers}
      />
      <PaywallSheet
        open={paywall !== null}
        onOpenChange={(open) => setPaywall(open ? paywall : null)}
        title={paywall === 'undo' ? t('paywall.undoTitle') : t('paywall.likesTitle')}
      />
    </section>
  );
}
