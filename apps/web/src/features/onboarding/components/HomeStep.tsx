import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/auth/auth-context';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { HomeEditor, useMyHome } from '@/features/home';

/** S-03 step 3 — «Tu casa» (data → photos → description) with live card preview. */
export function HomeStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const home = useMyHome();
  const [missingPhotos, setMissingPhotos] = useState(false);

  if (home.isPending) return <Skeleton className="h-96" />;
  if (home.isError) return <ErrorState onRetry={() => void home.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1">{t('onboarding.steps.3')}</h1>
      <p className="text-muted">{t('home.fields.zoneHint')}</p>
      {missingPhotos ? (
        <p role="alert" className="rounded-md border border-warning p-3">
          {t('errors.E_PHOTOS_MIN')}
        </p>
      ) : null}
      <HomeEditor
        key={missingPhotos ? 'photos' : 'start'}
        home={home.data}
        initialSub={missingPhotos ? 'photos' : undefined}
        onDone={(saved) => {
          if (!saved.complete) {
            setMissingPhotos(true);
            return;
          }
          void refreshMe().then(() => navigate('/app/onboarding/4'));
        }}
      />
    </div>
  );
}
