import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { THEMES, type Theme } from '@tinhome/shared/constants';
import { toneForTheme } from '@/components/brand-assets';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { TinHomeLogo } from '@/components/TinHomeLogo';
import { Button } from '@/components/ui/button';
import { captureTestError, isSentryEnabled } from '@/lib/sentry';

const SURFACE_TOKENS = ['bg', 'surface', 'surface-muted', 'border'] as const;
const COLOR_TOKENS = [
  'primary',
  'brand',
  'accent',
  'premium',
  'success',
  'warning',
  'danger',
  'pass',
] as const;

// Static class names so Tailwind can detect them.
const SWATCH_CLASS: Record<
  (typeof SURFACE_TOKENS)[number] | (typeof COLOR_TOKENS)[number],
  string
> = {
  bg: 'bg-bg',
  surface: 'bg-surface',
  'surface-muted': 'bg-surface-muted',
  border: 'bg-border',
  primary: 'bg-primary',
  brand: 'bg-brand',
  accent: 'bg-accent',
  premium: 'bg-premium',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  pass: 'bg-pass',
};

function ThemeSample({ theme }: { theme: Theme }) {
  const { t } = useTranslation();
  const tone = toneForTheme(theme);
  return (
    <section
      data-theme={theme}
      aria-label={t(`theme.options.${theme}`)}
      className="flex flex-col gap-4 rounded-lg border border-border bg-bg p-4 text-text"
    >
      <h3 className="text-h3">{t(`theme.options.${theme}`)}</h3>

      <div className="flex flex-wrap items-center gap-4">
        <TinHomeLogo variant="horizontal" tone={tone} height={32} />
        <TinHomeLogo variant="symbol" tone={tone} height={32} />
      </div>
      <div className="flex items-center gap-4 rounded-md bg-brand-gradient p-3">
        <TinHomeLogo variant="horizontal" tone="mono-white" height={28} />
      </div>

      <div className="rounded-md bg-surface p-3 shadow-card">
        <p className="font-display text-h2 font-extrabold">{t('dev.brand.displaySample')}</p>
        <p className="text-muted">{t('dev.brand.bodySample')}</p>
        <a href="#top" className="text-link underline">
          {t('dev.brand.linkSample')}
        </a>
      </div>

      <ul className="grid grid-cols-4 gap-2" aria-label={t('dev.brand.tokensTitle')}>
        {[...SURFACE_TOKENS, ...COLOR_TOKENS].map((token) => (
          <li key={token} className="flex flex-col items-center gap-1 text-caption">
            <span className={`h-8 w-full rounded-sm border border-border ${SWATCH_CLASS[token]}`} />
            <code>{token}</code>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button>{t('dev.brand.buttons.primary')}</Button>
        <Button variant="secondary">{t('dev.brand.buttons.secondary')}</Button>
        <Button variant="ghost">{t('dev.brand.buttons.ghost')}</Button>
        <Button variant="danger">{t('dev.brand.buttons.danger')}</Button>
        <Button variant="gradient">{t('dev.brand.buttons.gradient')}</Button>
        <Button disabled>{t('dev.brand.buttons.disabled')}</Button>
      </div>
    </section>
  );
}

/** Internal page (development only): tokens, buttons and logo in the three themes (M0). */
export function BrandPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const sentryOn = isSentryEnabled();

  return (
    <div id="top" className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t('dev.brand.title')}</h1>
        <p className="text-muted">{t('dev.brand.intro')}</p>
      </header>

      <ThemeSwitcher className="max-w-xl" />

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">{t('dev.brand.themesTitle')}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {THEMES.map((theme) => (
            <ThemeSample key={theme} theme={theme} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-h2">{t('dev.brand.sentryTitle')}</h2>
        <p className="text-muted">{t('dev.brand.sentryBody')}</p>
        <p className={sentryOn ? 'text-success' : 'text-warning'}>
          {sentryOn ? t('dev.brand.sentryEnabled') : t('dev.brand.sentryDisabled')}
        </p>
        <div>
          <Button
            variant="secondary"
            disabled={!sentryOn}
            onClick={() => {
              void captureTestError().then(() => setSent(true));
            }}
          >
            {t('dev.brand.sentryThrow')}
          </Button>
        </div>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {sent ? t('dev.brand.sentrySent') : ''}
        </p>
      </section>
    </div>
  );
}
