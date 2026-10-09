import { useTranslation } from 'react-i18next';
import { useTheme } from '@/app/theme-context';
import { useHydrated } from '@/hooks/use-hydrated';
import { cn } from '@/lib/utils';
import {
  LOGO_RATIO,
  logoSources,
  toneForTheme,
  type LogoTone,
  type LogoVariant,
} from './brand-assets';

interface TinHomeLogoProps {
  variant?: LogoVariant;
  /** `auto` follows the active theme: `light` in light, `dark` in dark and black. */
  tone?: 'auto' | LogoTone;
  /** Rendered height in px; width keeps the aspect ratio. */
  height?: number;
  /** Use when adjacent text already says «TinHome» (alt=""). */
  decorative?: boolean;
  className?: string;
}

/** C-25 — Always the official PNGs; never redrawn or recoloured. */
export function TinHomeLogo({
  variant = 'horizontal',
  tone = 'auto',
  height = 32,
  decorative = false,
  className,
}: TinHomeLogoProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  // The prerendered landing uses the light logo; switch after hydration to avoid a mismatch.
  const hydrated = useHydrated();
  const resolvedTone = tone === 'auto' ? toneForTheme(hydrated ? theme : 'light') : tone;
  const width = Math.round(LOGO_RATIO[variant] * height);
  const { src, srcSet } = logoSources(variant, resolvedTone);

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={`${String(width)}px`}
      alt={decorative ? '' : t('logo.alt')}
      width={width}
      height={height}
      decoding="async"
      data-tone={resolvedTone}
      className={cn('inline-block h-auto max-w-full select-none', className)}
      style={{ height }}
      draggable={false}
    />
  );
}
