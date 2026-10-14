import { useQuery } from '@tanstack/react-query';
import { ChevronRight, LifeBuoy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { listMyComplaints } from '@/lib/callables';
import { formatInstant } from '@/lib/format';

/** S-19 — `/app/soporte`: «Mis solicitudes» with status (FR-67). */
export function MyComplaintsPage() {
  const { t } = useTranslation();
  const list = useQuery({ queryKey: ['complaints'], queryFn: () => listMyComplaints({}) });
  let content;
  if (list.isPending) content = <Skeleton className="h-48" />;
  else if (list.isError) content = <ErrorState onRetry={() => void list.refetch()} />;
  else if (list.data.items.length === 0)
    content = <EmptyState icon={<LifeBuoy />} title={t('support.mine.empty')} />;
  else
    content = (
      <ul className="flex flex-col gap-2">
        {list.data.items.map((ticket) => (
          <li key={ticket.id}>
            <Link
              to={`/app/soporte/${ticket.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3 hover:bg-surface-muted"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">
                  {ticket.number} · {ticket.subject}
                </span>
                <span className="text-sm text-muted">
                  {t(`support.status.${ticket.status}`)} ·{' '}
                  {t('support.mine.due', { date: formatInstant(new Date(ticket.dueAt)) })}
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
      <Seo title={`${t('support.mine.title')} — TinHome`} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1">{t('support.mine.title')}</h1>
        <Button asChild>
          <Link to="/app/soporte/nueva">{t('support.mine.new')}</Link>
        </Button>
      </div>
      {content}
    </section>
  );
}
