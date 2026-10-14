import { useInfiniteQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { TICKET_STATUS, type TicketStatus } from '@tinhome/shared/constants';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { adminListComplaints } from '@/lib/callables';
import { cn } from '@/lib/utils';
import { relativeAge } from '../lib/format';

/** UX §9 — complaints queue: number, category, deadline and status (FR-67). */
export function ComplaintsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status = TICKET_STATUS.find((s) => s === params.get('estado'));
  const list = useInfiniteQuery({
    queryKey: ['admin', 'complaints', status ?? 'open'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      adminListComplaints({
        limit: 20,
        ...(status ? { status } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const filters: (TicketStatus | undefined)[] = [undefined, ...TICKET_STATUS];
  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.complaints.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.complaints.title')}</h1>
      <div
        role="group"
        aria-label={t('admin.reports.statusFilter')}
        className="flex flex-wrap gap-2"
      >
        {filters.map((value) => (
          <button
            key={value ?? 'open'}
            type="button"
            aria-pressed={value === status}
            onClick={() => setParams(value ? { estado: value } : {})}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-semibold',
              value === status ? 'border-primary bg-brand-soft text-brand-text' : 'border-border',
            )}
          >
            {value ? t(`support.status.${value}`) : t('admin.complaints.open')}
          </button>
        ))}
      </div>
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox />} title={t('admin.complaints.empty')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((ticket) => (
            <li
              key={ticket.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <span>
                <span className="font-semibold">{ticket.number}</span> ·{' '}
                {t(`support.categories.${ticket.category}`)} · {ticket.subject} ·{' '}
                {t(`support.status.${ticket.status}`)} · {t('admin.reports.due')}{' '}
                {relativeAge(ticket.dueAt)}
              </span>
              <Button asChild size="sm" variant="secondary">
                <Link to={`/admin/quejas/${ticket.id}`}>{t('admin.reports.open')}</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
      {list.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => void list.fetchNextPage()}
        >
          {t('admin.verifications.loadMore')}
        </Button>
      ) : null}
    </section>
  );
}
