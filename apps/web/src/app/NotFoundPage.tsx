import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-h1">{t('notFound.title')}</h1>
      <p className="text-muted">{t('notFound.body')}</p>
      <Button asChild>
        <Link to="/">{t('notFound.cta')}</Link>
      </Button>
    </section>
  );
}
