import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { SwipeDemo } from './SwipeDemo';

/** S-01 hero: the visitor must understand TinHome in 5 s. One gradient element per screen. */
export function Hero() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-10 overflow-x-clip px-4 py-12 md:grid-cols-2 md:py-20">
      <div className="flex flex-col gap-5">
        <h1 className="text-h1 text-balance md:text-display">{t('landing.hero.title')}</h1>
        <p className="text-lg text-muted">{t('landing.hero.subtitle')}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="gradient" size="lg">
            <Link to="/registro">{t('landing.hero.ctaPrimary')}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link to="/como-funciona">{t('landing.hero.ctaSecondary')}</Link>
          </Button>
        </div>
      </div>
      <SwipeDemo />
    </section>
  );
}
