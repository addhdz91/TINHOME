import { Heart, Info, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/** C-04 — Undo (small), Pass (large), Detail (small), Like (large, brand gradient). */
export function ActionBar({
  onUndo,
  onPass,
  onOpen,
  onLike,
  canUndo,
  disabled,
}: {
  onUndo: () => void;
  onPass: () => void;
  onOpen: () => void;
  onLike: () => void;
  canUndo: boolean;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const round =
    'inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface shadow-card transition-transform active:scale-95 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  return (
    <div
      className="flex items-center justify-center gap-4"
      role="group"
      aria-label={t('discover.actions')}
    >
      <button
        type="button"
        className={cn(round, 'size-11')}
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={t('discover.undo')}
        aria-keyshortcuts="Z"
      >
        <RotateCcw aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        className={cn(round, 'size-16 text-pass')}
        onClick={onPass}
        disabled={disabled}
        aria-label={t('discover.pass')}
        aria-keyshortcuts="ArrowLeft"
      >
        <X aria-hidden="true" className="size-8" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        className={cn(round, 'size-11')}
        onClick={onOpen}
        disabled={disabled}
        aria-label={t('discover.open')}
        aria-keyshortcuts="ArrowUp"
      >
        <Info aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        className={cn(round, 'size-16 border-0 bg-brand-gradient text-on-media')}
        onClick={onLike}
        disabled={disabled}
        aria-label={t('discover.like')}
        aria-keyshortcuts="ArrowRight"
      >
        <Heart aria-hidden="true" className="size-8 fill-current" />
      </button>
    </div>
  );
}
