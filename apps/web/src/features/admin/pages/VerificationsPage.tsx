import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertTriangle, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { VERIFICATION_STATUS, type VerificationStatus } from '@tinhome/shared/constants';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { adminListVerifications } from '@/lib/callables';
import { cn } from '@/lib/utils';
import { relativeAge } from '../lib/format';

/** UX §9 — verification queue (oldest first) by status. */
export function VerificationsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const status: VerificationStatus =
    VERIFICATION_STATUS.find((s) => s === params.get('estado')) ?? 'PENDING';
  const list = useInfiniteQuery({
    queryKey: ['admin', 'verifications', status],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      adminListVerifications({ status, limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.verifications.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.verifications.title')}</h1>
      <div
        role="group"
        aria-label={t('admin.verifications.statusFilter')}
        className="flex flex-wrap gap-2"
      >
        {VERIFICATION_STATUS.map((value) => (
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
            {t(`admin.verifications.statuses.${value}`)}
          </button>
        ))}
      </div>
      {list.isPending ? (
        <Skeleton className="h-64" />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox />} title={t('admin.verifications.empty')} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="text-sm text-muted">
              <tr>
                <th className="p-2">{t('admin.verifications.age')}</th>
                <th className="p-2">{t('admin.verifications.name')}</th>
                <th className="p-2">{t('admin.verifications.city')}</th>
                <th className="p-2">{t('admin.verifications.tenure')}</th>
                <th className="p-2">{t('admin.verifications.flags')}</th>
                <th className="p-2">
                  <span className="sr-only">{t('admin.verifications.open')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="p-2">{relativeAge(item.submittedAt)}</td>
                  <td className="p-2 font-semibold">{item.displayName}</td>
                  <td className="p-2">{item.cityId ?? '—'}</td>
                  <td className="p-2">{t(`home.tenures.${item.tenure}`)}</td>
                  <td className="p-2">
                    {item.duplicate ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-danger">
                        <AlertTriangle aria-hidden="true" className="size-4" />
                        {t('admin.verifications.duplicate')}
                      </span>
                    ) : null}
                    {item.fraudSuspicion ? (
                      <span className="block text-sm font-semibold text-danger">
                        {t('admin.verifications.fraud')}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link to={`/admin/verificaciones/${item.id}`}>
                        {t('admin.verifications.open')}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
