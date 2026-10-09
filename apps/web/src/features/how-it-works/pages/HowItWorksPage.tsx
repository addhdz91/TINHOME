import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Seo } from '@/components/Seo';
import { Button } from '@/components/ui/button';

/** `/como-funciona` (FR-57). Static content from es.json. */
export function HowItWorksPage() {
  const { t } = useTranslation();
  const steps = t('howItWorks.steps', { returnObjects: true });
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
      <Seo title={t('seo.howItWorks.title')} description={t('seo.howItWorks.description')} />
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{t('howItWorks.title')}</h1>
        <p className="text-lg text-muted">{t('howItWorks.intro')}</p>
      </header>
      <ol className="flex flex-col gap-4">
        {steps.map((step) => (
          <li key={step.title} className="rounded-lg border border-border bg-surface p-5">
            <h2 className="text-h3">{step.title}</h2>
            <p className="mt-1 text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="flex items-start gap-3 rounded-lg border border-warning p-4">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        <span>{t('howItWorks.noMoney')}</span>
      </p>
      <Button asChild size="lg" className="self-start">
        <Link to="/lista-espera">{t('howItWorks.cta')}</Link>
      </Button>
    </article>
  );
}
