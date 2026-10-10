import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HomeCard as HomeCardModel } from '@tinhome/shared/schemas';
import { CompatibilityChips } from '@/components/CompatibilityChips';
import { HomeCard } from '@/components/HomeCard';
import { TrustBadges } from '@/components/TrustBadges';

export type SwipeDirection = 'like' | 'pass';

interface SwipeDeckProps {
  cards: HomeCardModel[];
  viewerCityName: string;
  windowNames: ReadonlyMap<string, string>;
  onSwipe: (card: HomeCardModel, direction: SwipeDirection) => void;
  onOpen: (card: HomeCardModel) => void;
  /** Imperative swipe from the ActionBar or the keyboard: increments to fire. */
  command: { direction: SwipeDirection; nonce: number } | null;
}

const THRESHOLD = 0.3;
const VELOCITY = 500;

/** Preloads the photos of the next cards (C-02). */
function usePreload(cards: HomeCardModel[]) {
  useEffect(() => {
    for (const card of cards) {
      const url = card.photos[0]?.cardUrl;
      if (url) new Image().src = url;
    }
  }, [cards]);
}

function DeckCardContent({
  card,
  viewerCityName,
  windowNames,
  photoIndex,
  eager,
}: {
  card: HomeCardModel;
  viewerCityName: string;
  windowNames: ReadonlyMap<string, string>;
  photoIndex: number;
  eager: boolean;
}) {
  return (
    <HomeCard
      home={{ ...card, title: card.title }}
      eager={eager}
      photoIndex={photoIndex}
      galleryBars
      className="shadow-sheet"
      chips={
        <div className="flex flex-col gap-1">
          <TrustBadges
            verified={card.host.identityVerified}
            top={card.isTop}
            founder={card.host.foundingMember}
            rating={card.rating}
            onMedia
          />
          <CompatibilityChips
            compatibility={card.compatibility}
            likedYou={card.likedYou}
            viewerCityName={viewerCityName}
            windowNames={windowNames}
            petsAllowed={card.petsAllowed}
            onMedia
          />
        </div>
      }
    />
  );
}

/**
 * C-02 — stack of 3 cards; the top one follows the finger (`drag="x"`, ±12°), passes the
 * threshold at 30 % of the width or 500 px/s and shows the «ME GUSTA» / «PASO» stamps.
 * Taps on the sides change the photo; a tap in the centre opens the detail.
 */
export function SwipeDeck({
  cards,
  viewerCityName,
  windowNames,
  onSwipe,
  onOpen,
  command,
}: SwipeDeckProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-12, 0, 12]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const top = cards[0];
  usePreload(cards.slice(1, 4));

  const fly = (direction: SwipeDirection) => {
    if (!top) return;
    const width = ref.current?.offsetWidth ?? 400;
    const done = () => {
      x.set(0);
      setPhotoIndex(0);
      onSwipe(top, direction);
    };
    if (reduced) {
      done();
      return;
    }
    void animate(x, direction === 'like' ? width * 1.5 : -width * 1.5, { duration: 0.25 }).then(
      done,
    );
  };

  const lastCommand = useRef<number | null>(null);
  useEffect(() => {
    if (!command || command.nonce === lastCommand.current) return;
    lastCommand.current = command.nonce;
    fly(command.direction);
  });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const width = ref.current?.offsetWidth ?? 400;
    if (info.offset.x > width * THRESHOLD || info.velocity.x > VELOCITY) fly('like');
    else if (info.offset.x < -width * THRESHOLD || info.velocity.x < -VELOCITY) fly('pass');
    else void animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
  };

  const onTap = (event: MouseEvent | TouchEvent | PointerEvent) => {
    if (!top || !ref.current) return;
    const point = 'clientX' in event ? event.clientX : (event.changedTouches[0]?.clientX ?? 0);
    const box = ref.current.getBoundingClientRect();
    const relative = (point - box.left) / box.width;
    if (relative < 0.3) setPhotoIndex((i) => Math.max(0, i - 1));
    else if (relative > 0.7) setPhotoIndex((i) => Math.min(top.photos.length - 1, i + 1));
    else onOpen(top);
  };

  return (
    <div ref={ref} className="relative mx-auto aspect-[3/4] w-full max-w-sm">
      {cards
        .slice(0, 3)
        .toReversed()
        .map((card, reverseIndex, visible) => {
          const depth = visible.length - 1 - reverseIndex;
          if (depth > 0) {
            return (
              <div
                key={card.homeId}
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  transform: `scale(${String(1 - depth * 0.04)}) translateY(${String(depth * 10)}px)`,
                }}
              >
                <DeckCardContent
                  card={card}
                  viewerCityName={viewerCityName}
                  windowNames={windowNames}
                  photoIndex={0}
                  eager={false}
                />
              </div>
            );
          }
          return (
            <motion.div
              key={card.homeId}
              className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
              style={{ x, rotate }}
              drag="x"
              dragElastic={0.9}
              dragMomentum={false}
              onDragEnd={onDragEnd}
              onTap={onTap}
            >
              <DeckCardContent
                card={card}
                viewerCityName={viewerCityName}
                windowNames={windowNames}
                photoIndex={photoIndex}
                eager
              />
              <motion.span
                aria-hidden="true"
                style={{ opacity: likeOpacity }}
                className="pointer-events-none absolute top-8 left-6 -rotate-12 rounded-md bg-brand-gradient px-3 py-1 font-display text-h2 font-extrabold text-on-media"
              >
                {t('discover.stampLike')}
              </motion.span>
              <motion.span
                aria-hidden="true"
                style={{ opacity: passOpacity }}
                className="pointer-events-none absolute top-8 right-6 rotate-12 rounded-md border-4 border-pass px-3 py-1 font-display text-h2 font-extrabold text-on-media"
              >
                {t('discover.stampPass')}
              </motion.span>
            </motion.div>
          );
        })}
    </div>
  );
}
