import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PREMIUM_SOURCE } from '@tinhome/shared/constants';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { adminGetDashboard } from '@/lib/callables';
import { relativeAge } from '../lib/format';

function Kpi({
  label,
  value,
  detail,
  to,
}: {
  label: string;
  value: number;
  detail?: string;
  to?: string;
}) {
  const body = (
    <>
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="text-h1">{value}</span>
      {detail ? <span className="text-sm text-muted">{detail}</span> : null}
    </>
  );
  const className = 'flex flex-col gap-1 rounded-lg border border-border bg-surface p-4';
  return to ? (
    <Link to={to} className={`${className} hover:border-primary`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** FR-49 — admin home with the basic KPIs. */
export function AdminHomePage() {
  const { t } = useTranslation();
  const kpis = useQuery({ queryKey: ['admin', 'dashboard'], queryFn: () => adminGetDashboard({}) });

  let content;
  if (kpis.isPending) content = <Skeleton className="h-96" />;
  else if (kpis.isError) content = <ErrorState onRetry={() => void kpis.refetch()} />;
  else {
    const data = kpis.data;
    content = (
      <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label={t('admin.home.pendingVerifications')}
            value={data.pendingVerifications.count}
            detail={
              data.pendingVerifications.oldestAt
                ? t('admin.home.oldest', { age: relativeAge(data.pendingVerifications.oldestAt) })
                : t('admin.home.none')
            }
            to="/admin/verificaciones"
          />
          <Kpi
            label={t('admin.home.locationReviews')}
            value={data.pendingLocationReviews}
            to="/admin/ubicaciones"
          />
          <Kpi label={t('admin.home.openReports')} value={data.openReports} />
          <Kpi label={t('admin.home.newUsers')} value={data.newUsers7d} />
          <Kpi label={t('admin.home.matches')} value={data.matches7d} />
          <Kpi label={t('admin.home.exchanges')} value={data.exchangesConfirmed30d} />
        </div>
        <section aria-labelledby="premium-title" className="flex flex-col gap-3">
          <h2 id="premium-title" className="text-h2">
            {t('admin.home.premium')}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-4">
            {PREMIUM_SOURCE.map((source) => (
              <div key={source} className="rounded-lg border border-border p-3">
                <dt className="text-sm text-muted">{t(`admin.home.sources.${source}`)}</dt>
                <dd className="text-h2">{data.premiumBySource[source]}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="cities-title" className="flex flex-col gap-3">
          <h2 id="cities-title" className="text-h2">
            {t('admin.home.cities')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="text-sm text-muted">
                <tr>
                  <th className="p-2">{t('admin.home.city')}</th>
                  <th className="p-2">{t('admin.home.status')}</th>
                  <th className="p-2">{t('admin.home.visible')}</th>
                  <th className="p-2">{t('admin.home.founders')}</th>
                </tr>
              </thead>
              <tbody>
                {data.cities.map((city) => (
                  <tr key={city.id} className="border-t border-border">
                    <td className="p-2 font-semibold">{city.name}</td>
                    <td className="p-2">{t(`admin.home.cityStatus.${city.status}`)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <progress
                          className="h-2 w-32 accent-primary"
                          max={city.threshold}
                          value={Math.min(city.visibleCandidates, city.threshold)}
                          aria-label={`${city.name}: ${String(city.visibleCandidates)} / ${String(city.threshold)}`}
                        />
                        <span className="text-sm">
                          {city.visibleCandidates} / {city.threshold}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">{city.foundersAwarded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <Seo title={`${t('admin.home.title')} — ${t('admin.title')}`} />
      <h1 className="text-h1">{t('admin.home.title')}</h1>
      {content}
    </section>
  );
}
