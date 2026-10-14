import { useInfiniteQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScrollRegion } from '@/components/ScrollRegion';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { adminListAudit } from '@/lib/callables';
import { formatInstant, formatTime } from '@/lib/format';

/** UX §9 / FR-55 — insert-only audit log with filters (superadmin). */
export function AuditPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ targetType: '', targetId: '', actorUid: '' });
  const [applied, setApplied] = useState(filters);
  const list = useInfiniteQuery({
    queryKey: ['admin', 'audit', applied],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      adminListAudit({
        limit: 50,
        ...(applied.targetType ? { targetType: applied.targetType } : {}),
        ...(applied.targetId ? { targetId: applied.targetId } : {}),
        ...(applied.actorUid ? { actorUid: applied.actorUid } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.audit.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.audit.title')}</h1>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied(filters);
        }}
      >
        <TextField
          label={t('admin.audit.targetType')}
          value={filters.targetType}
          onChange={(e) => setFilters({ ...filters, targetType: e.target.value.trim() })}
        />
        <TextField
          label={t('admin.audit.targetId')}
          value={filters.targetId}
          onChange={(e) => setFilters({ ...filters, targetId: e.target.value.trim() })}
        />
        <TextField
          label={t('admin.audit.actor')}
          value={filters.actorUid}
          onChange={(e) => setFilters({ ...filters, actorUid: e.target.value.trim() })}
        />
        <Button type="submit">{t('admin.audit.filter')}</Button>
      </form>
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<ScrollText />} title={t('admin.audit.empty')} />
      ) : (
        <ScrollRegion label={t('common.tableRegion')}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="p-2">{t('admin.audit.when')}</th>
                <th className="p-2">{t('admin.audit.action')}</th>
                <th className="p-2">{t('admin.audit.target')}</th>
                <th className="p-2">{t('admin.audit.actor')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">
                    {entry.createdAt
                      ? `${formatInstant(new Date(entry.createdAt))} ${formatTime(new Date(entry.createdAt))}`
                      : '—'}
                  </td>
                  <td className="p-2 font-mono">{entry.action}</td>
                  <td className="p-2 break-all">
                    {entry.targetType}/{entry.targetId}
                  </td>
                  <td className="p-2 break-all">
                    {entry.actorUid} ({entry.actorRole})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
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
