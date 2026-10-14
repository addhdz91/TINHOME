import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import type { SponsoredCard as SponsoredCardSchema } from '@tinhome/shared/schemas';
import { cn } from '@/lib/utils';

export type SponsoredCardData = z.infer<typeof SponsoredCardSchema>;

/**
 * FR-47 / BR-28 — always labelled «Patrocinado»; the link goes through TinHome's own redirect
 * (`/r/{partnerId}`), which counts the click without cookies or third-party pixels.
 */
export function SponsoredCard({
  card,
  className,
}: {
  card: SponsoredCardData;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <aside
      aria-label={t('sponsored.label')}
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4',
        className,
      )}
    >
      <p className="self-start rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
        {t('sponsored.label')}
      </p>
      <div className="flex items-start gap-3">
        <img
          src={card.logoUrl}
          alt=""
          loading="lazy"
          className="size-12 shrink-0 rounded-md bg-surface object-contain"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-semibold break-words">{card.title}</p>
          <p className="text-sm break-words text-muted">{card.text}</p>
        </div>
      </div>
      <a
        href={card.clickUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={t('sponsored.visitAria', { title: card.title })}
        className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-link underline"
      >
        {t('sponsored.visit')}
        <ExternalLink aria-hidden="true" className="size-4" />
      </a>
      <p className="text-xs text-muted">{t('sponsored.why')}</p>
    </aside>
  );
}
