import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { useCities } from '@/features/cities';
import { useMyHome } from '@/features/home';
import { LocationCheck } from '../components/LocationCheck';

/** S-18 — `/app/verificacion/ubicacion`, full screen (opened from the desktop QR). */
export function LocationPage() {
  const { t } = useTranslation();
  const home = useMyHome();
  const cities = useCities();
  let content;
  if (home.isPending) content = <Skeleton className="h-64" />;
  else if (home.isError) content = <ErrorState onRetry={() => void home.refetch()} />;
  else if (!home.data) {
    content = (
      <Link to="/app/onboarding/3" className="font-semibold text-link underline">
        {t('home.my.create')}
      </Link>
    );
  } else {
    const cityName = cities.data?.find((city) => city.id === home.data?.cityId)?.name ?? '';
    content = <LocationCheck home={home.data} cityName={cityName} />;
  }
  return (
    <section className="flex max-w-2xl flex-col gap-6 py-4">
      <Seo title={`${t('location.title')} — TinHome`} />
      <h1 className="text-h1">{t('location.title')}</h1>
      {content}
    </section>
  );
}
