import { Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router';
import { ONBOARDING_STEPS, type OnboardingStep } from '@tinhome/shared/constants';
import { useMe } from '@/app/auth/auth-context';
import { EmptyState } from '@/components/EmptyState';
import { ProgressStepper } from '@/components/ProgressStepper';
import { Seo } from '@/components/Seo';
import { TinHomeLogo } from '@/components/TinHomeLogo';
import { PhoneStep } from '../components/PhoneStep';
import { WelcomeStep } from '../components/WelcomeStep';

function toStep(value: string | undefined): OnboardingStep | null {
  return ONBOARDING_STEPS.find((step) => String(step) === value) ?? null;
}

function PendingStep() {
  const { t } = useTranslation();
  // TODO(M3): steps 3–6 (home, travel preferences, verification, publish).
  return (
    <EmptyState
      icon={<Hourglass />}
      title={t('onboarding.pending.title')}
      body={t('onboarding.pending.body')}
    />
  );
}

/**
 * S-03 — `/app/onboarding/:paso`. Progress is saved by the server; skipping ahead is not allowed.
 * «Guardar y salir» leaves to the landing: steps 2–4 are mandatory, so the app would bring the
 * user straight back here (decision recorded in 10_DECISIONS §5).
 */
export function OnboardingPage() {
  const { t } = useTranslation();
  const me = useMe();
  const { paso } = useParams();
  const step = toStep(paso);
  const reached = me.onboarding.step;

  if (step === null || step > reached)
    return <Navigate to={`/app/onboarding/${String(reached)}`} replace />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-border bg-surface pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
          <TinHomeLogo variant="symbol" height={28} />
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold hover:bg-surface-muted"
          >
            {t('onboarding.saveAndExit')}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6">
        <Seo title={t('seo.onboarding.title', { step })} />
        <ProgressStepper current={step} reached={reached} />
        {step === 1 ? <WelcomeStep /> : step === 2 ? <PhoneStep /> : <PendingStep />}
      </main>
    </div>
  );
}
