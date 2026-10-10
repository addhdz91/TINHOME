import { Award, BadgeCheck, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** C-07 — Verificado, Top, Fundador and number of reviews; each with an explanation (title). */
export function TrustBadges({
  verified,
  top,
  founder,
  rating,
  onMedia = false,
}: {
  verified: boolean;
  top: boolean;
  founder: boolean;
  rating: { avg: number; count: number } | null;
  onMedia?: boolean;
}) {
  const { t } = useTranslation();
  const base = cn(
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold [&_svg]:size-3.5',
    onMedia ? 'bg-overlay text-on-media' : 'bg-surface-muted text-text',
  );
  return (
    <ul className="flex flex-wrap gap-1" aria-label={t('badges.label')}>
      {verified ? (
        <li className={base} title={t('badges.verifiedHint')}>
          <BadgeCheck aria-hidden="true" className="text-accent" />
          {t('badges.verified')}
        </li>
      ) : null}
      {top ? (
        <li className={base} title={t('badges.topHint')}>
          <Star aria-hidden="true" className="fill-current text-premium" />
          {t('badges.top')}
        </li>
      ) : null}
      {founder ? (
        <li className={base} title={t('badges.founderHint')}>
          <Award aria-hidden="true" />
          {t('badges.founder')}
        </li>
      ) : null}
      {rating && rating.count > 0 ? (
        <li className={base}>
          <Star aria-hidden="true" />
          {t('badges.rating', { avg: rating.avg.toFixed(1), count: rating.count })}
        </li>
      ) : null}
    </ul>
  );
}
