import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { SafeMarkdown } from '@/features/legal';
import { rateFaq } from '@/lib/callables';
import { useFaqs } from '../api/use-faqs';

/** «¿Te ha servido?» (FR-66): one vote per article and device. */
function RateArticle({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const [voted, setVoted] = useState(false);
  const rate = useMutation({
    mutationFn: (helpful: boolean) => rateFaq({ slug, helpful }),
    onSuccess: () => setVoted(true),
  });
  if (voted) return <p role="status">{t('help.thanks')}</p>;
  return (
    <div role="group" aria-labelledby="faq-rate" className="flex flex-wrap items-center gap-2">
      <span id="faq-rate" className="font-semibold">
        {t('help.helpful')}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={rate.isPending}
        onClick={() => rate.mutate(true)}
      >
        {t('help.yes')}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={rate.isPending}
        onClick={() => rate.mutate(false)}
      >
        {t('help.no')}
      </Button>
    </div>
  );
}

/** `/ayuda/:slug` — one FAQ article, «¿Te ha servido?» and «Contactar con TinHome» (FR-66). */
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
          <RateArticle slug={faq.slug} />
          <Link to="/reclamaciones" className="font-semibold text-link underline">
            {t('help.contact')}
          </Link>
        </>
      )}
    </article>
  );
}
