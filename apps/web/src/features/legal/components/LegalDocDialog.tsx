import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LegalDocSlug } from '@tinhome/shared/constants';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { formatInstant } from '@/lib/format';
import { useLegalDoc } from '../api/use-legal-doc';
import { SafeMarkdown } from './SafeMarkdown';

function LegalDocBody({ slug }: { slug: LegalDocSlug }) {
  const { t } = useTranslation();
  const doc = useLegalDoc(slug);
  if (doc.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">{t('auth.legalSheet.loading')}</span>
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (doc.isError || !doc.data)
    return <ErrorState message={t('auth.legalSheet.error')} onRetry={() => void doc.refetch()} />;
  return (
    <>
      <p className="text-sm text-muted">
        {t('legal.version', { version: doc.data.version })}
        {doc.data.publishedAt ? ` · ${formatInstant(doc.data.publishedAt)}` : ''}
      </p>
      <SafeMarkdown markdown={doc.data.markdown} />
    </>
  );
}

/** S-02 — opens a legal text in a sheet without leaving the form. */
export function LegalDocDialog({ slug, trigger }: { slug: LegalDocSlug; trigger: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={t(`legal.docs.${slug}`)} closeLabel={t('auth.legalSheet.close')}>
        <LegalDocBody slug={slug} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline link that opens the text in a sheet; usable as a `<Trans>` component (the translated
 * words arrive as `children`).
 */
export function LegalLink({ slug, children }: { slug: LegalDocSlug; children?: ReactNode }) {
  return (
    <LegalDocDialog
      slug={slug}
      trigger={
        <button type="button" className="text-link underline">
          {children}
        </button>
      }
    />
  );
}
