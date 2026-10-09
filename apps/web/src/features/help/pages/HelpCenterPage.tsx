import { ChevronRight, Search } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { FAQ_CATEGORIES } from '@tinhome/shared/constants';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { useFaqs, type Faq } from '../api/use-faqs';
import { searchFaqs } from '../search';

/** S-19 quick links (slugs seeded in scripts/seed-data/faqs.ts). */
const QUICK = [
  'como-funciona-la-verificacion',
  'mi-casa-no-aparece',
  'como-denunciar',
  'premium-y-pagos',
];

function FaqLink({ faq }: { faq: Faq }) {
  return (
    <Link
      to={`/ayuda/${faq.slug}`}
      className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 font-semibold hover:bg-surface-muted"
    >
      {faq.question}
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
    </Link>
  );
}

/** C-30 / FR-66 — `/ayuda`: instant search, quick links and categories. */
export function HelpCenterPage() {
  const { t } = useTranslation();
  const faqs = useFaqs();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);

  let content;
  if (faqs.isPending) {
    content = (
      <div aria-busy="true" className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} className="h-12" />
        ))}
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  } else if (faqs.isError) {
    content = <ErrorState onRetry={() => void faqs.refetch()} />;
  } else if (faqs.data.length === 0) {
    content = <EmptyState title={t('help.empty')} />;
  } else if (deferred.trim().length > 0) {
    const results = searchFaqs(faqs.data, deferred);
    content = (
      <section aria-labelledby="help-results" className="flex flex-col gap-2">
        <h2 id="help-results" className="text-h3" aria-live="polite">
          {t('help.results', { count: results.length })}
        </h2>
        {results.length === 0 ? (
          <p className="text-muted">{t('help.noResults', { query: deferred })}</p>
        ) : (
          results.map((faq) => <FaqLink key={faq.slug} faq={faq} />)
        )}
      </section>
    );
  } else {
    const quick = QUICK.flatMap((slug) => faqs.data.filter((faq) => faq.slug === slug));
    content = (
      <>
        {quick.length > 0 ? (
          <section aria-labelledby="help-quick" className="flex flex-col gap-2">
            <h2 id="help-quick" className="text-h3">
              {t('help.quickTitle')}
            </h2>
            {quick.map((faq) => (
              <FaqLink key={faq.slug} faq={faq} />
            ))}
          </section>
        ) : null}
        <section aria-labelledby="help-categories" className="flex flex-col gap-4">
          <h2 id="help-categories" className="text-h3">
            {t('help.categoriesTitle')}
          </h2>
          {FAQ_CATEGORIES.map((category) => {
            const items = faqs.data.filter((faq) => faq.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="flex flex-col gap-2">
                <h3 className="font-sans text-base font-semibold text-muted">
                  {t(`help.categories.${category}`)}
                </h3>
                {items.map((faq) => (
                  <FaqLink key={faq.slug} faq={faq} />
                ))}
              </div>
            );
          })}
        </section>
      </>
    );
  }

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <Seo title={t('seo.help.title')} description={t('seo.help.description')} />
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t('help.title')}</h1>
        <p className="text-muted">{t('help.intro')}</p>
      </header>
      <div role="search" className="relative">
        <label htmlFor="help-search" className="sr-only">
          {t('help.search')}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted"
        />
        <input
          id="help-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('help.searchPlaceholder')}
          className="min-h-12 w-full rounded-md border border-border bg-surface pr-3 pl-11 text-text"
        />
      </div>
      {content}
    </article>
  );
}
