import { useTranslation } from 'react-i18next';
import { TinHomeLogo } from '@/components/TinHomeLogo';

/** S-01 placeholder: the full landing is built in M1. */
export function LandingPage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
      <TinHomeLogo variant="full" height={120} decorative />
      <h1 className="text-display text-balance">{t('landing.title')}</h1>
      <p className="text-lg text-muted">{t('landing.subtitle')}</p>
      <p className="rounded-md bg-brand-soft px-4 py-3 text-brand-text">
        {t('landing.comingSoon')}
      </p>
    </section>
  );
}
