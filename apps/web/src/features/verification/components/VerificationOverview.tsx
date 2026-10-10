import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { useCities } from '@/features/cities';
import { useMyHome } from '@/features/home';
import { useMyVerification } from '../api/use-my-verification';
import { IdentityForm } from './IdentityForm';
import { IdentityStatus } from './IdentityStatus';
import { LocationCheck } from './LocationCheck';

/**
 * Both checks of BR-04 on one screen (S-14 + S-18): identity (reviewed by a person) and the
 * one-time location reading. Used by `/app/verificacion` and the onboarding step 5.
 */
export function VerificationOverview() {
  const { t } = useTranslation();
  const verification = useMyVerification();
  const home = useMyHome();
  const cities = useCities();

  if (verification.isPending || home.isPending) return <Skeleton className="h-96" />;
  if (verification.isError || home.isError) {
    return (
      <ErrorState
        onRetry={() => {
          void verification.refetch();
          void home.refetch();
        }}
      />
    );
  }
  const current = verification.data;
  const canSend =
    current === null || current.status === 'REJECTED' || current.status === 'INFO_REQUESTED';
  const cityName = cities.data?.find((city) => city.id === home.data?.cityId)?.name ?? '';

  return (
    <div className="flex flex-col gap-8">
      <p className="flex items-start gap-3 rounded-md bg-brand-soft p-3 text-brand-text">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {t('onboarding.verificationLater.trust')}
      </p>
      <section aria-labelledby="identity-title" className="flex flex-col gap-4">
        <h2 id="identity-title" className="text-h2">
          {t('verification.identityTitle')}
        </h2>
        {current ? <IdentityStatus verification={current} /> : null}
        {canSend ? (
          <IdentityForm defaultTenure={home.data?.tenure ?? current?.tenure ?? 'OWNER'} />
        ) : null}
      </section>
      <section aria-labelledby="location-title" className="flex flex-col gap-4">
        <h2 id="location-title" className="text-h2">
          {t('location.title')}
        </h2>
        {home.data ? (
          <LocationCheck home={home.data} cityName={cityName} />
        ) : (
          <p className="text-muted">
            {t('location.needsHome')}{' '}
            <Link to="/app/onboarding/3" className="font-semibold text-link underline">
              {t('home.my.create')}
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
