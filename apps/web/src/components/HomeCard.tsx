import { BedDouble, Home, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface HomeCardData {
  title: string;
  cityName: string;
  zone: string;
  maxGuests: number;
  bedrooms: number;
  photos: { cardUrl: string; width: number; height: number }[];
}

interface HomeCardProps {
  home: HomeCardData;
  /** Badges and compatibility chips (C-06, C-07) rendered over the scrim. */
  chips?: ReactNode;
  /** The first card of the deck is not lazy (LCP). */
  eager?: boolean;
  /** Photo shown (gallery by taps on the sides, C-03). */
  photoIndex?: number;
  /** Bars at the top that show which photo is visible. */
  galleryBars?: boolean;
  className?: string;
}

/** C-03 — full-bleed cover (3:4), bottom scrim with title, city · zone, capacity and chips. */
export function HomeCard({
  home,
  chips,
  eager = false,
  photoIndex = 0,
  galleryBars = false,
  className,
}: HomeCardProps) {
  const { t } = useTranslation();
  const index = Math.min(Math.max(0, photoIndex), Math.max(0, home.photos.length - 1));
  const cover = home.photos[index];
  const title = home.title || t('home.preview.untitled');
  return (
    <article
      className={cn(
        'relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-surface-muted shadow-card',
        className,
      )}
    >
      {cover ? (
        <img
          src={cover.cardUrl}
          alt={t('home.photos.alt', { n: index + 1, total: home.photos.length, title })}
          width={cover.width}
          height={cover.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-brand-soft text-brand-text">
          <Home aria-hidden="true" className="size-16" strokeWidth={1.5} />
          <span className="text-sm">{t('home.preview.noPhoto')}</span>
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-card-scrim" />
      {galleryBars && home.photos.length > 1 ? (
        <div aria-hidden="true" className="absolute inset-x-3 top-3 flex gap-1">
          {home.photos.map((photo, i) => (
            <span
              key={photo.cardUrl}
              className={cn(
                'h-1 flex-1 rounded-full bg-on-media',
                i === index ? 'opacity-100' : 'opacity-40',
              )}
            />
          ))}
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
        <h3 className="font-display text-h3 font-extrabold text-on-media">{title}</h3>
        <p className="text-sm text-on-media/90">
          {[home.cityName, home.zone].filter(Boolean).join(' · ')}
        </p>
        <p className="flex items-center gap-3 text-sm text-on-media/90">
          <span className="inline-flex items-center gap-1">
            <Users aria-hidden="true" className="size-4" />
            {t('home.preview.guests', { count: home.maxGuests })}
          </span>
          <span className="inline-flex items-center gap-1">
            <BedDouble aria-hidden="true" className="size-4" />
            {t('home.preview.bedrooms', { count: home.bedrooms })}
          </span>
        </p>
        {chips ? <div className="mt-1 flex flex-wrap gap-1">{chips}</div> : null}
      </div>
    </article>
  );
}
