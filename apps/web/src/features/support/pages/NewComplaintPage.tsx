import { useTranslation } from 'react-i18next';
import { Seo } from '@/components/Seo';
import { ComplaintForm } from '../components/ComplaintForm';

/** `/app/soporte/nueva` — complaint of a signed-in user (followed in «Mis solicitudes»). */
export function NewComplaintPage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5 py-4">
      <Seo title={`${t('support.title')} — TinHome`} />
      <h1 className="text-h1">{t('support.title')}</h1>
      <p>{t('support.intro')}</p>
      <ComplaintForm visitor={false} />
    </section>
  );
}
