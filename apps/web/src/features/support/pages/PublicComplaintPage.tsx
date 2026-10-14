import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Seo } from '@/components/Seo';
import { ComplaintForm } from '../components/ComplaintForm';

/** S-19 — `/reclamaciones`: complaints also for visitors (FR-67). */
export function PublicComplaintPage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-12">
      <Seo title={`${t('support.title')} — TinHome`} description={t('support.intro')} />
      <h1 className="text-h1">{t('support.title')}</h1>
      <p>{t('support.intro')}</p>
      <p className="text-sm">
        {t('support.haveAccount')}{' '}
        <Link
          to="/entrar?next=%2Fapp%2Fsoporte%2Fnueva"
          className="font-semibold text-link underline"
        >
          {t('support.signIn')}
        </Link>
      </p>
      <ComplaintForm visitor />
    </section>
  );
}
