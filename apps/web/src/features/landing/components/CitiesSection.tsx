import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import {
  CityProgress,
  DemandCounter,
  useActiveWindows,
  useCities,
  useInvite,
  useTopDemand,
} from '@/features/cities';

/** S-01 — CityProgress of the corridor cities and live DemandCounter (FR-17, FR-18). */
export function CitiesSection() {
  const { t } = useTranslation();
  const cities = useCities();
  const windows = useActiveWindows();
  const demand = useTopDemand();
  const invite = useInvite();

  const demandLoading = demand.isPending || windows.isPending || cities.isPending;
  const demandError = demand.isError || windows.isError;

  return (
    <section aria-labelledby="cities-title" className="mx-auto max-w-[1200px] px-4 py-12">
      <h2 id="cities-title" className="text-h2">
        {t('landing.cities.title')}
      </h2>
      <p className="mt-2 mb-6 text-muted">{t('landing.cities.subtitle')}</p>

      {cities.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-36" />
          ))}
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : cities.isError ? (
        <ErrorState onRetry={() => void cities.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cities.data.map((city) => (
            <CityProgress key={city.id} city={city} onInvite={invite} />
          ))}
        </div>
      )}

      <h3 className="mt-10 mb-4 text-h3">{t('landing.demand.title')}</h3>
      {demandLoading ? (
        <Skeleton className="h-16" />
      ) : demandError || cities.isError ? (
        <ErrorState
          onRetry={() => {
            void demand.refetch();
            void windows.refetch();
          }}
        />
      ) : demand.data.length === 0 ? (
        <EmptyState title={t('landing.demand.empty')} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {demand.data.map((stat) => (
            <li key={stat.id}>
              <DemandCounter stat={stat} cities={cities.data} windows={windows.data} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
