import { useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { toIsoDate, addDays } from '@tinhome/shared/domain';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/ui/button';
import { useCities } from '@/features/cities';
import { toUserMessage } from '@/lib/app-error';
import { adminExportCsv, adminGetMetrics } from '@/lib/callables';
import { formatNumber } from '@/lib/format';

const REPORTS = ['FUNNEL', 'DEMAND', 'USERS'] as const;

function download(url: string, name: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  link.click();
}

/**
 * UX §9 / FR-54 — funnel by city (one-hue horizontal bars, values as text, each bar with a
 * tooltip; the same numbers in the accessible list), Premium, demand table and CSV export.
 */
export function MetricsPage() {
  const { t } = useTranslation();
  const cities = useCities();
  const today = toIsoDate(new Date());
  const [from, setFrom] = useState<string>(addDays(today, -30));
  const [to, setTo] = useState<string>(today);
  const [cityId, setCityId] = useState('');
  const metrics = useQuery({
    queryKey: ['admin', 'metrics', from, to, cityId],
    queryFn: () => adminGetMetrics({ from, to, ...(cityId ? { cityId } : {}) }),
  });
  const exportCsv = useMutation({
    mutationFn: (report: (typeof REPORTS)[number]) => adminExportCsv({ report, from, to }),
    onSuccess: (result, report) =>
      download(result.url, `tinhome-${report.toLowerCase()}-${from}-${to}.csv`),
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  let content;
  if (metrics.isPending) content = <Skeleton className="h-96" />;
  else if (metrics.isError) content = <ErrorState onRetry={() => void metrics.refetch()} />;
  else {
    const { funnel, premium, demand, sponsored, truncated } = metrics.data;
    const max = Math.max(1, ...funnel.map((step) => step.count));
    content = (
      <>
        <section
          aria-labelledby="metrics-funnel"
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <h2 id="metrics-funnel" className="text-h3">
            {t('admin.metrics.funnel')}
          </h2>
          {truncated ? (
            <p className="text-sm text-warning">{t('admin.metrics.truncated')}</p>
          ) : null}
          <ol className="flex flex-col gap-2">
            {funnel.map((step) => {
              const percent = funnel[0]?.count
                ? Math.round((step.count / funnel[0].count) * 100)
                : 0;
              const label = t(`admin.metrics.steps.${step.step}`);
              return (
                <li
                  key={step.step}
                  className="grid grid-cols-[10rem_minmax(0,1fr)_6rem] items-center gap-3 text-sm"
                >
                  <span>{label}</span>
                  <span
                    className="h-6 rounded-sm bg-surface-muted"
                    title={`${label}: ${formatNumber(step.count)} (${String(percent)} %)`}
                  >
                    <span
                      className="block h-full rounded-r bg-primary"
                      style={{ width: `${String((step.count / max) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums">
                    {formatNumber(step.count)} · {percent} %
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
        <section
          aria-labelledby="metrics-premium"
          className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
        >
          <h2 id="metrics-premium" className="text-h3">
            {t('admin.metrics.premium')}
          </h2>
          <p className="text-h2 tabular-nums">{formatNumber(premium.active)}</p>
          <p className="text-sm text-muted">
            {t('admin.metrics.conversion', { percent: premium.conversionPercent })} ·{' '}
            {Object.entries(premium.bySource)
              .map(
                ([source, count]) =>
                  `${t(`admin.home.sources.${source as 'ADMIN'}`)} ${formatNumber(count)}`,
              )
              .join(' · ')}
          </p>
        </section>
        <section aria-labelledby="metrics-demand" className="flex flex-col gap-2">
          <h2 id="metrics-demand" className="text-h3">
            {t('admin.metrics.demand')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="p-2">{t('admin.metrics.from')}</th>
                  <th className="p-2">{t('admin.metrics.to')}</th>
                  <th className="p-2">{t('admin.metrics.window')}</th>
                  <th className="p-2 text-right">{t('admin.metrics.count')}</th>
                </tr>
              </thead>
              <tbody>
                {demand.map((row) => (
                  <tr
                    key={`${row.fromCityId}-${row.toCityId}-${row.windowId}`}
                    className="border-t border-border"
                  >
                    <td className="p-2">{row.fromCityId}</td>
                    <td className="p-2">{row.toCityId}</td>
                    <td className="p-2">{row.windowId}</td>
                    <td className="p-2 text-right tabular-nums">{formatNumber(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section aria-labelledby="metrics-sponsored" className="flex flex-col gap-2">
          <h2 id="metrics-sponsored" className="text-h3">
            {t('admin.metrics.sponsored')}
          </h2>
          {sponsored.length === 0 ? (
            <p className="text-muted">{t('admin.users.none')}</p>
          ) : (
            <ul className="text-sm">
              {sponsored.map((partner) => (
                <li key={partner.partnerId}>
                  {partner.name}: {formatNumber(partner.clicks)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.metrics.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.metrics.title')}</h1>
      <div
        role="group"
        aria-label={t('admin.metrics.filters')}
        className="flex flex-wrap items-end gap-3"
      >
        <TextField
          label={t('admin.metrics.fromDate')}
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          label={t('admin.metrics.toDate')}
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">{t('admin.metrics.city')}</span>
          <select
            className="min-h-11 rounded-md border border-border bg-surface px-3"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            <option value="">{t('admin.metrics.allCities')}</option>
            {(cities.data ?? []).map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
        {REPORTS.map((report) => (
          <Button
            key={report}
            variant="secondary"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate(report)}
          >
            <Download aria-hidden="true" />
            {t(`admin.metrics.export.${report}`)}
          </Button>
        ))}
      </div>
      {content}
    </section>
  );
}
