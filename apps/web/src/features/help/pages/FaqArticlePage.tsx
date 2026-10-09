import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { SafeMarkdown } from '@/features/legal';
import { useFaqs } from '../api/use-faqs';

/**
 * `/ayuda/:slug` — one FAQ article. «¿Te ha servido?» (rateFaq) and «Contactar con TinHome»
 * (complaints) arrive in M9.
 */
export function FaqArticlePage() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const faqs = useFaqs();
  const faq = faqs.data?.find((item) => item.slug === slug);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-12">
      <Link
        to="/ayuda"
        className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-link"
      >
        <ArrowLeft aria-hidden="true" className="size-5" />
        {t('help.backToHelp')}
      </Link>
      {faqs.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-40" />
        </div>
      ) : faqs.isError ? (
        <ErrorState onRetry={() => void faqs.refetch()} />
      ) : !faq ? (
        <EmptyState
          headingLevel={1}
          title={t('help.notFound')}
          action={
            <Button asChild variant="secondary">
              <Link to="/ayuda">{t('help.backToHelp')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Seo title={`${faq.question} — ${t('help.title')} TinHome`} />
          <p className="text-sm font-semibold text-muted">{t(`help.categories.${faq.category}`)}</p>
          <h1 className="text-h1">{faq.question}</h1>
          <SafeMarkdown markdown={faq.answerMarkdown} />
        </>
      )}
    </article>
  );
}
