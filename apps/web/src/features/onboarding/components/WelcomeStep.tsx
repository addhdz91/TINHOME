import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useMe } from '@/app/auth/auth-context';
import { Button } from '@/components/ui/button';

/** S-03 step 1 — welcome with the user's name and what comes next (≈ 3 min). */
export function WelcomeStep() {
  const { t } = useTranslation();
  const me = useMe();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h1">{t('onboarding.welcome.title', { name: me.firstName })}</h1>
      <p className="flex items-start gap-3 text-lg">
        <Clock aria-hidden="true" className="mt-1 size-5 shrink-0 text-brand-text" />
        {t('onboarding.welcome.body')}
      </p>
      <p className="rounded-md bg-brand-soft p-3 text-brand-text">
        {t('onboarding.welcome.trust')}
      </p>
      <Button size="lg" className="self-start" onClick={() => void navigate('/app/onboarding/2')}>
        {t('onboarding.welcome.start')}
      </Button>
    </div>
  );
}
