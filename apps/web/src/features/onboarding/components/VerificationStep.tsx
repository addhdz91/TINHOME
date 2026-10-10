import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMe } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';
import { VerificationOverview } from '@/features/verification';

/** S-03 step 5 — identity and location (FR-08, FR-63). Both can be finished later. */
export function VerificationStep() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useMe();
  const sent = me.verification.identity !== 'NONE';
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">{t('onboarding.verificationLater.title')}</h1>
      <p>{t('onboarding.verificationLater.body')}</p>
      <VerificationOverview />
      <Button
        size="lg"
        variant={sent ? 'primary' : 'secondary'}
        className="self-start"
        onClick={() => void navigate('/app/onboarding/6')}
      >
        {sent ? t('onboarding.verificationLater.next') : t('onboarding.verificationLater.continue')}
      </Button>
    </div>
  );
}
