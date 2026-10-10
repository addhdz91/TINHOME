import { useTranslation } from 'react-i18next';
import { Seo } from '@/components/Seo';
import { VerificationOverview } from '../components/VerificationOverview';

/** S-14 — `/app/verificacion`. */
export function VerificationPage() {
  const { t } = useTranslation();
  return (
    <section className="flex max-w-2xl flex-col gap-6 py-4">
      <Seo title={`${t('verification.title')} — TinHome`} />
      <h1 className="text-h1">{t('verification.title')}</h1>
      <VerificationOverview />
    </section>
  );
}
