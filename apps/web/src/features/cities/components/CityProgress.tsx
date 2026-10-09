import { CheckCircle2, Share2 } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { computeCityProgress } from '@tinhome/shared/domain';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { City } from '../api/use-cities';

interface CityProgressProps {
  city: City;
  onInvite?: () => void;
  className?: string;
}

/** C-13 — progress towards opening (FR-17, BR-21): visible candidates vs threshold. */
export function CityProgress({ city, onInvite, className }: CityProgressProps) {
  const { t } = useTranslation();
  const labelId = useId();
  const progress = computeCityProgress(city.counters.visibleCandidates, city.openThreshold);
  const isOpen = city.status === 'OPEN';

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={labelId} className="text-h3">
          {city.name}
        </h3>
        {isOpen ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-text">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {t('cities.open')}
          </span>
        ) : (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-muted">
            {t('cities.waitlist')}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={progress.threshold}
        aria-valuenow={Math.min(progress.count, progress.threshold)}
        aria-valuetext={t('cities.progressValue', {
          count: progress.count,
          threshold: progress.threshold,
        })}
        className="h-3 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${String(progress.percent)}%` }}
        />
      </div>
      <p className="text-sm text-muted">
        {isOpen
          ? t('cities.openBody', { count: formatNumber(progress.count) })
          : t('cities.waitlistBody', {
              city: city.name,
              threshold: formatNumber(progress.threshold),
              count: formatNumber(progress.count),
            })}
      </p>
      {!isOpen && onInvite ? (
        <Button variant="secondary" size="sm" className="self-start" onClick={onInvite}>
          <Share2 aria-hidden="true" />
          {t('cities.invite')}
        </Button>
      ) : null}
    </article>
  );
}
