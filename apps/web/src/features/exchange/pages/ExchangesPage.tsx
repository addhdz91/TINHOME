import { CalendarDays, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { formatIsoDate } from '@/lib/format';
import { useMyExchanges } from '../api/use-exchanges';

/** `/app/intercambios` — every exchange I declared or was proposed, latest first. */
export function ExchangesPage() {
  const { t } = useTranslation();
  const me = useMe();
  const list = useMyExchanges(me.uid);

  let content;
  if (list.status === 'loading') content = <Skeleton className="h-48" />;
  else if (list.status === 'error') content = <ErrorState />;
  else if (list.data.length === 0)
    content = (
      <EmptyState
        icon={<CalendarDays />}
        title={t('exchange.list.empty')}
        body={t('exchange.list.emptyBody')}
        action={
          <Button asChild variant="secondary">
            <Link to="/app/chats">{t('nav.chats')}</Link>
          </Button>
        }
      />
    );
  else
    content = (
      <ul className="flex flex-col gap-2">
        {list.data.map((exchange) => (
          <li key={exchange.id}>
            <Link
              to={`/app/intercambios/${exchange.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 hover:bg-surface-muted"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">
                  {t('exchange.page.datesRange', {
                    start: formatIsoDate(exchange.startDate),
                    end: formatIsoDate(exchange.endDate),
                  })}
                </span>
                <span className="text-sm text-muted">
                  {t(`exchange.status.${exchange.status}`)}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    );

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 py-4">
      <Seo title={`${t('exchange.list.title')} — TinHome`} />
      <h1 className="text-h1">{t('exchange.list.title')}</h1>
      {content}
    </section>
  );
}
