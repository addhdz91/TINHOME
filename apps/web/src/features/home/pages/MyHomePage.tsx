import { useMutation } from '@tanstack/react-query';
import { Home, Pause, Pencil, Play, Plane } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { HomeCard } from '@/components/HomeCard';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useCities } from '@/features/cities';
import { toUserMessage } from '@/lib/app-error';
import { pauseHome, unpauseHome } from '@/lib/callables';
import { useMyHome, useSetMyHome } from '../api/use-my-home';
import { HomeStatusCard } from '../components/HomeStatusCard';

/** `/app/mi-casa` — status with explanation, completion %, preview, edit and pause (FR-13). */
export function MyHomePage() {
  const { t } = useTranslation();
  const me = useMe();
  const home = useMyHome();
  const cities = useCities();
  const setHome = useSetMyHome();
  const toggle = useMutation({
    mutationFn: (pause: boolean) => (pause ? pauseHome({}) : unpauseHome({})),
    onSuccess: ({ home: saved }) => {
      setHome(saved);
      toast.success(saved.status === 'PAUSED' ? t('home.my.paused') : t('home.my.unpaused'));
    },
    onError: (error) => toast.error(toUserMessage(t, error)),
  });

  let content;
  if (home.isPending) content = <Skeleton className="h-96" />;
  else if (home.isError) content = <ErrorState onRetry={() => void home.refetch()} />;
  else if (!home.data) {
    content = (
      <EmptyState
        icon={<Home />}
        title={t('home.my.empty')}
        action={
          <Button asChild>
            <Link to="/app/onboarding/3">{t('home.my.create')}</Link>
          </Button>
        }
      />
    );
  } else {
    const data = home.data;
    const city = cities.data?.find((c) => c.id === data.cityId);
    content = (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
        <HomeCard
          home={{
            title: data.title ?? '',
            zone: data.zone ?? '',
            maxGuests: data.maxGuests ?? 1,
            bedrooms: data.bedrooms ?? 0,
            photos: data.photos,
            cityName: city?.name ?? '',
          }}
          eager
        />
        <div className="flex flex-col gap-4">
          <HomeStatusCard home={data} />
          <p className="text-sm font-semibold">
            {t('home.my.completed', { percent: me.onboarding.percent })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link to="/app/mi-casa/editar">
                <Pencil aria-hidden="true" />
                {t('home.my.edit')}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/app/viaje">
                <Plane aria-hidden="true" />
                {t('home.my.trip')}
              </Link>
            </Button>
            {data.status === 'PUBLISHED' || data.status === 'PAUSED' ? (
              <Button
                variant="ghost"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate(data.status === 'PUBLISHED')}
              >
                {data.status === 'PUBLISHED' ? (
                  <Pause aria-hidden="true" />
                ) : (
                  <Play aria-hidden="true" />
                )}
                {data.status === 'PUBLISHED' ? t('home.my.pause') : t('home.my.unpause')}
              </Button>
            ) : (
              <Button asChild>
                <Link to="/app/onboarding/6">{t('home.my.publish')}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6 py-4">
      <Seo title={`${t('home.my.title')} — TinHome`} />
      <h1 className="text-h1">{t('home.my.title')}</h1>
      {content}
    </section>
  );
}
