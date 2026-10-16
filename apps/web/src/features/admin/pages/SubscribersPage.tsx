import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { SUBSCRIBER_SEGMENTS, type SubscriberSegment } from '@tinhome/shared/constants';
import type { SubscriberRow } from '@tinhome/shared/schemas';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ScrollRegion } from '@/components/ScrollRegion';
import { SelectField } from '@/components/SelectField';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useCities } from '@/features/cities';
import { toUserMessage } from '@/lib/app-error';
import {
  adminExportSubscribers,
  adminGetSubscriberStats,
  adminListSubscribers,
} from '@/lib/callables';
import { formatInstant, formatNumber, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE = 25;
const EXPIRY_OPTIONS = ['', '7', '30', '90'] as const;
const COLUMNS = ['name', 'email', 'city', 'segment', 'expires', 'plan', 'consent'] as const;

function download(url: string, name: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.click();
}

function Kpi({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="text-h1 tabular-nums">{value}</span>
      {detail ? <span className="text-sm text-muted">{detail}</span> : null}
    </div>
  );
}

function ExpiryCell({ row }: { row: SubscriberRow }) {
  const { t } = useTranslation();
  if (!row.premiumUntil) return <>—</>;
  const when = formatInstant(new Date(row.premiumUntil));
  if (row.daysLeft === null) return <>{t('admin.subscribers.ended', { date: when })}</>;
  if (row.segment === 'PAID_ACTIVE') return <>{t('admin.subscribers.renews', { date: when })}</>;
  return <>{t('admin.subscribers.endsIn', { count: row.daysLeft, date: when })}</>;
}

/**
 * Subscribers panel (superadmin): who is paying, who has a gifted Premium about to end and
 * who left, to plan campaigns. Campaign exports only carry people who accepted commercial
 * e-mails (FR-46, LSSI art. 21); every list and export is audited.
 */
export function SubscribersPage() {
  const { t } = useTranslation();
  const cities = useCities();
  const [cityId, setCityId] = useState('');
  const [segment, setSegment] = useState<SubscriberSegment | null>(null);
  const [expiring, setExpiring] = useState<(typeof EXPIRY_OPTIONS)[number]>('');
  const [marketingOnly, setMarketingOnly] = useState(false);
  const filters = {
    ...(cityId ? { cityId } : {}),
    ...(segment ? { segment } : {}),
    ...(expiring ? { expiringWithinDays: Number(expiring) } : {}),
  };

  const stats = useQuery({
    queryKey: ['admin', 'subscribers', 'stats', cityId],
    queryFn: () => adminGetSubscriberStats(cityId ? { cityId } : {}),
  });
  const list = useInfiniteQuery({
    queryKey: ['admin', 'subscribers', 'list', filters, marketingOnly],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      adminListSubscribers({
        ...filters,
        ...(marketingOnly ? { marketingOnly } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
        limit: PAGE,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const exportCsv = useMutation({
    mutationFn: () => adminExportSubscribers(filters),
    onSuccess: (result) => {
      if (result.rows === 0) {
        toast.info(t('admin.subscribers.exportEmpty'));
        return;
      }
      download(result.url, t('admin.subscribers.fileName', { segment: segment ?? 'todos' }));
      toast.success(t('admin.subscribers.exported', { count: result.rows }));
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const count = (key: SubscriberSegment) =>
    stats.data?.segments.find((s) => s.segment === key)?.count ?? 0;

  let overview;
  if (stats.isPending) overview = <Skeleton className="h-64" />;
  else if (stats.isError) overview = <ErrorState onRetry={() => void stats.refetch()} />;
  else {
    const data = stats.data;
    overview = (
      <>
        {data.truncated ? (
          <p className="text-sm text-warning">{t('admin.subscribers.truncated')}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label={t('admin.subscribers.kpis.mrr')}
            value={formatPrice(data.mrrCents)}
            detail={t('admin.subscribers.kpis.plans', {
              monthly: data.plans.monthly,
              yearly: data.plans.yearly,
            })}
          />
          <Kpi
            label={t('admin.subscribers.kpis.paying')}
            value={formatNumber(count('PAID_ACTIVE') + count('PAID_CANCELING'))}
            detail={t('admin.subscribers.kpis.canceling', { count: count('PAID_CANCELING') })}
          />
          <Kpi
            label={t('admin.subscribers.kpis.expiring')}
            value={formatNumber(data.expiringIn30Days)}
            detail={t('admin.subscribers.kpis.expiringHint')}
          />
          <Kpi
            label={t('admin.subscribers.kpis.conversion')}
            value={`${formatNumber(
              data.total
                ? Math.round(
                    ((count('PAID_ACTIVE') + count('PAID_CANCELING')) / data.total) * 1000,
                  ) / 10
                : 0,
            )} %`}
            detail={t('admin.subscribers.kpis.accounts', { count: data.total })}
          />
        </div>
        <section aria-labelledby="subscribers-segments" className="flex flex-col gap-3">
          <h2 id="subscribers-segments" className="text-h3">
            {t('admin.subscribers.segmentsTitle')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUBSCRIBER_SEGMENTS.map((key) => {
              const item = data.segments.find((s) => s.segment === key);
              const active = segment === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSegment(active ? null : key)}
                  className={cn(
                    'flex flex-col gap-1 rounded-lg border bg-surface p-4 text-left transition-colors duration-fast ease-brand hover:border-primary',
                    active ? 'border-primary bg-brand-soft' : 'border-border',
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{t(`admin.subscribers.segments.${key}`)}</span>
                    <span className="text-h2 tabular-nums">{formatNumber(item?.count ?? 0)}</span>
                  </span>
                  <span className="text-sm text-muted">
                    {t(`admin.subscribers.actions.${key}`)}
                  </span>
                  <span className="text-sm">
                    {t('admin.subscribers.optInCount', { count: item?.marketingOptIn ?? 0 })}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </>
    );
  }

  let table;
  if (list.isPending) table = <Skeleton className="h-64" />;
  else if (list.isError) table = <ErrorState onRetry={() => void list.refetch()} />;
  else if (rows.length === 0)
    table = <EmptyState headingLevel={2} title={t('admin.subscribers.empty')} />;
  else
    table = (
      <>
        <ScrollRegion label={t('common.tableRegion')}>
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">{t('admin.subscribers.tableCaption')}</caption>
            <thead className="text-muted">
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col} scope="col" className="p-2 font-semibold">
                    {t(`admin.subscribers.cols.${col}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.uid}
                  className="border-t border-border transition-colors duration-fast hover:bg-surface-muted"
                >
                  <td className="p-2">
                    <Link
                      to={`/admin/usuarios/${row.uid}`}
                      className="font-semibold text-link underline"
                    >
                      {row.displayName || row.uid}
                    </Link>
                  </td>
                  <td className="p-2 break-all">{row.email ?? '—'}</td>
                  <td className="p-2">
                    {cities.data?.find((c) => c.id === row.cityId)?.name ?? row.cityId ?? '—'}
                  </td>
                  <td className="p-2">
                    {t(`admin.subscribers.segments.${row.segment}`)}
                    {row.premiumSource ? (
                      <span className="block text-muted">
                        {t(`admin.subscribers.sources.${row.premiumSource}`)}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2">
                    <ExpiryCell row={row} />
                  </td>
                  <td className="p-2">
                    {row.plan ? t(`admin.subscribers.plans.${row.plan}`) : '—'}
                    {row.cancelAtPeriodEnd ? (
                      <span className="block text-warning">{t('admin.subscribers.cancels')}</span>
                    ) : null}
                  </td>
                  <td className="p-2">
                    {row.marketingOptIn ? t('admin.subscribers.yes') : t('admin.subscribers.no')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
        {list.hasNextPage ? (
          <Button
            variant="secondary"
            className="self-center"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {t('admin.subscribers.more')}
          </Button>
        ) : null}
      </>
    );

  return (
    <section className="flex flex-col gap-5">
      <Seo title={`${t('admin.subscribers.title')} — ${t('admin.title')}`} />
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">{t('admin.subscribers.title')}</h1>
        <p className="text-muted">{t('admin.subscribers.intro')}</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          className="min-w-48"
          label={t('admin.subscribers.city')}
          value={cityId}
          onChange={(event) => setCityId(event.target.value)}
          options={[
            { value: '', label: t('admin.subscribers.allCities') },
            ...(cities.data ?? []).map((city) => ({ value: city.id, label: city.name })),
          ]}
        />
        <SelectField
          className="min-w-48"
          label={t('admin.subscribers.expiring')}
          value={expiring}
          onChange={(event) =>
            setExpiring(EXPIRY_OPTIONS.find((option) => option === event.target.value) ?? '')
          }
          options={EXPIRY_OPTIONS.map((value) => ({
            value,
            label: value
              ? t('admin.subscribers.expiringDays', { count: Number(value) })
              : t('admin.subscribers.expiringAny'),
          }))}
        />
      </div>
      {overview}
      <section aria-labelledby="subscribers-list" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="subscribers-list" className="text-h3">
            {segment
              ? t(`admin.subscribers.segments.${segment}`)
              : t('admin.subscribers.listTitle')}{' '}
            <span className="text-muted tabular-nums">({formatNumber(total)})</span>
          </h2>
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              checked={marketingOnly}
              onChange={(event) => setMarketingOnly(event.target.checked)}
            />
            {t('admin.subscribers.marketingOnly')}
          </label>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-sm">{t('admin.subscribers.exportHint')}</p>
          <Button
            variant="secondary"
            className="self-start"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            <Download aria-hidden="true" />
            {t('admin.subscribers.export')}
          </Button>
        </div>
        {table}
      </section>
    </section>
  );
}
