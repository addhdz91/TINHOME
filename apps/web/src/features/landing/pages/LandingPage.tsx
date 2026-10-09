import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/ui/button';
import { useHydrated } from '@/hooks/use-hydrated';
import { Hero } from '../components/Hero';
import { Steps } from '../components/Steps';
import { Trust } from '../components/Trust';

// Below the fold and data-driven (Firestore + zod): loaded after the hero has painted.
const CitiesSection = lazy(async () => ({
  default: (await import('../components/CitiesSection')).CitiesSection,
}));
const Faq = lazy(async () => ({ default: (await import('../components/Faq')).Faq }));

/** S-01 — Landing: understand in 5 s and join the waitlist (registration arrives in M2). */
export function LandingPage() {
  const { t } = useTranslation();
  // Lazy sections cannot finish in the build-time prerender: render their skeleton until hydrated.
  const hydrated = useHydrated();
  const sectionsFallback = <Skeleton className="mx-auto my-12 h-64 max-w-[1200px]" />;
  return (
    <>
      <Seo title={t('seo.landing.title')} description={t('seo.landing.description')} />
      <Hero />
      <Steps />
      <Trust />
      {hydrated ? (
        <Suspense fallback={sectionsFallback}>
          <CitiesSection />
          <Faq />
        </Suspense>
      ) : (
        sectionsFallback
      )}
      <section className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 pt-4 pb-16 text-center">
        <h2 className="text-h2">{t('landing.finalCta.title')}</h2>
        <p className="text-muted">{t('landing.finalCta.body')}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/registro">{t('landing.hero.ctaPrimary')}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/lista-espera">{t('landing.hero.ctaWaitlist')}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
