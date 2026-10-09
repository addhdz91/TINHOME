import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { LEGAL_DOC_SLUGS, type LegalDocSlug } from '@tinhome/shared/constants';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { formatInstant } from '@/lib/format';
import { useLegalDoc } from '../api/use-legal-doc';
import { SafeMarkdown } from '../components/SafeMarkdown';

function isLegalSlug(value: string | undefined): value is LegalDocSlug {
  return LEGAL_DOC_SLUGS.some((slug) => slug === value);
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t('legal.notFoundTitle')}
      headingLevel={1}
      action={
        <Button asChild variant="secondary">
          <Link to="/">{t('common.backHome')}</Link>
        </Button>
      }
    />
  );
}

function LegalDocument({ slug }: { slug: LegalDocSlug }) {
  const { t } = useTranslation();
  const doc = useLegalDoc(slug);

  if (doc.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }
  if (doc.isError) return <ErrorState onRetry={() => void doc.refetch()} />;
  if (!doc.data) return <NotFound />;

  return (
    <>
      <Seo title={t('seo.legal.title', { title: doc.data.title })} />
      {/* FR-57 — version and date always visible. */}
      <p className="text-sm text-muted">
        {t('legal.version', { version: doc.data.version })}
        {doc.data.publishedAt ? ` · ${formatInstant(doc.data.publishedAt)}` : ''}
      </p>
      <SafeMarkdown markdown={doc.data.markdown} />
    </>
  );
}

/** `/legal/:slug` — public legal texts from `legalDocs` (FR-57). */
export function LegalPage() {
  const { slug } = useParams();
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12">
      {isLegalSlug(slug) ? <LegalDocument key={slug} slug={slug} /> : <NotFound />}
    </article>
  );
}
