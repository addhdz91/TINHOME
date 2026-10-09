import { useTranslation } from 'react-i18next';

/** Shown while the first lazy route chunk loads (no layout shift, announced politely). */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh items-center justify-center">
      <span className="sr-only">{t('common.loading')}</span>
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-4 border-border border-t-primary"
      />
    </div>
  );
}
