import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useMyHome } from '../api/use-my-home';
import { TravelPrefsEditor } from '../components/TravelPrefsEditor';

/** `/app/viaje` — destinations, windows, dates and travellers (FR-14–16). */
export function TripPage() {
  const { t } = useTranslation();
  const home = useMyHome();
  return (
    <section className="flex max-w-2xl flex-col gap-6 py-4">
      <Seo title={`${t('nav.trip')} — TinHome`} />
      <h1 className="text-h1">{t('trip.title')}</h1>
      {home.isPending ? (
        <Skeleton className="h-96" />
      ) : home.isError ? (
        <ErrorState onRetry={() => void home.refetch()} />
      ) : !home.data ? (
        <EmptyState
          title={t('home.my.empty')}
          action={
            <Button asChild>
              <Link to="/app/onboarding/3">{t('home.my.create')}</Link>
            </Button>
          }
        />
      ) : (
        <TravelPrefsEditor home={home.data} onDone={() => toast.success(t('trip.saved'))} />
      )}
    </section>
  );
}
