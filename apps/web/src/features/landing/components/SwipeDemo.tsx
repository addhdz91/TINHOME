import { Heart, Home, Pause, Play, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * S-01 — mock card swiping right in a 3 s loop. Pausable (WCAG 2.2.2); with
 * `prefers-reduced-motion` the global rule stops the animation.
 */
export function SwipeDemo() {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);

  return (
    <figure className="relative mx-auto flex w-full max-w-[320px] flex-col items-center gap-3">
      <div
        aria-hidden="true"
        className="absolute -inset-8 -z-10 rounded-full bg-brand-gradient opacity-20 blur-3xl"
      />
      <div className="relative aspect-[3/4] w-full">
        <div className="absolute inset-0 translate-y-3 scale-95 rounded-xl border border-border bg-surface-muted" />
        <div
          role="img"
          aria-label={t('landing.mock.label')}
          className={cn(
            'absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card animate-swipe-demo',
            paused && 'paused',
          )}
        >
          <div className="relative flex flex-1 items-center justify-center bg-brand-soft text-brand-text">
            <Home aria-hidden="true" className="size-20" strokeWidth={1.5} />
            <span
              className={cn(
                'absolute top-6 left-4 -rotate-12 rounded-md bg-brand-gradient px-3 py-1 font-display text-h3 font-extrabold animate-swipe-stamp',
                paused && 'paused',
              )}
            >
              {t('landing.mock.stamp')}
            </span>
          </div>
          <div className="flex flex-col gap-1 p-4">
            <span className="font-display text-h3 font-extrabold text-text">
              {t('landing.mock.title')}
            </span>
            <span className="text-sm text-muted">{t('landing.mock.place')}</span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <Users aria-hidden="true" className="size-4" />
              {t('landing.mock.guests')}
            </span>
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary px-3 py-1 text-caption font-semibold text-primary-foreground">
              <Heart aria-hidden="true" className="size-3" />
              {t('landing.mock.chip')}
            </span>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        {paused ? t('landing.mock.play') : t('landing.mock.pause')}
      </Button>
    </figure>
  );
}
