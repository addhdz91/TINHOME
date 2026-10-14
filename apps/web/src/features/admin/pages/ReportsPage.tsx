import { useInfiniteQuery } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { REPORT_STATUS, type ReportStatus } from '@tinhome/shared/constants';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScrollRegion } from '@/components/ScrollRegion';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { adminListReports } from '@/lib/callables';
import { cn } from '@/lib/utils';
import { relativeAge } from '../lib/format';

const SOON_MS = 6 * 3_600_000;
const TONES = { overdue: 'text-danger', soon: 'text-warning', ok: 'text-success' } as const;

/** Traffic light of the review deadline (24 h / 72 h). */
function deadlineTone(leftMs: number): string {
  if (leftMs < 0) return TONES.overdue;
  return leftMs < SOON_MS ? TONES.soon : TONES.ok;
}

/** UX §9 — moderation queue by priority with a deadline traffic light (24 h / 72 h). */
export function ReportsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status: ReportStatus = REPORT_STATUS.find((s) => s === params.get('estado')) ?? 'OPEN';
  const list = useInfiniteQuery({
    queryKey: ['admin', 'reports', status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      adminListReports({ status, limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const [now] = useState(() => Date.now());

  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.reports.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.reports.title')}</h1>
      <div
        role="group"
        aria-label={t('admin.reports.statusFilter')}
        className="flex flex-wrap gap-2"
      >
        {REPORT_STATUS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={value === status}
            onClick={() => setParams({ estado: value })}
            className={cn(
              'min-h-11 rounded-full border px-4 text-sm font-semibold',
              value === status ? 'border-primary bg-brand-soft text-brand-text' : 'border-border',
            )}
          >
            {t(`admin.reports.statuses.${value}`)}
          </button>
        ))}
      </div>
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox />} title={t('admin.reports.empty')} />
      ) : (
        <ScrollRegion label={t('common.tableRegion')}>
          <table className="w-full min-w-[720px] text-left">
            <thead className="text-sm text-muted">
              <tr>
                <th className="p-2">{t('admin.reports.deadline')}</th>
                <th className="p-2">{t('admin.reports.priority')}</th>
                <th className="p-2">{t('admin.reports.reason')}</th>
                <th className="p-2">{t('admin.reports.target')}</th>
                <th className="p-2">{t('admin.reports.reporter')}</th>
                <th className="p-2">
                  <span className="sr-only">{t('admin.reports.open')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const left = new Date(item.dueAt).getTime() - now;
                const tone = deadlineTone(left);
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className={cn('p-2 font-semibold', tone)}>{relativeAge(item.dueAt)}</td>
                    <td className="p-2">{t(`admin.reports.priorities.${item.priority}`)}</td>
                    <td className="p-2">{t(`report.reasons.${item.reason}`)}</td>
                    <td className="p-2">{t(`admin.reports.targets.${item.targetType}`)}</td>
                    <td className="p-2 text-sm">
                      {item.public
                        ? t('admin.reports.public')
                        : item.reporterVerified
                          ? t('admin.reports.verified')
                          : t('admin.reports.unverified')}
                    </td>
                    <td className="p-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link to={`/admin/denuncias/${item.id}`}>{t('admin.reports.open')}</Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollRegion>
      )}
      {list.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-start"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {t('admin.verifications.loadMore')}
        </Button>
      ) : null}
    </section>
  );
}
