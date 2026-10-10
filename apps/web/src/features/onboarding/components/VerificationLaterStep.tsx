import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';

/** S-03 step 5 — identity and location verification (built in M4); it can be done later. */
export function VerificationLaterStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1">{t('onboarding.verificationLater.title')}</h1>
      <p>{t('onboarding.verificationLater.body')}</p>
      <p className="flex items-start gap-3 rounded-md bg-brand-soft p-3 text-brand-text">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {t('onboarding.verificationLater.trust')}
      </p>
      <Button size="lg" className="self-start" onClick={() => void navigate('/app/onboarding/6')}>
        {t('onboarding.verificationLater.continue')}
      </Button>
    </div>
  );
}
