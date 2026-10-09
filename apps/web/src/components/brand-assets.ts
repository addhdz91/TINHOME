import type { Theme } from '@tinhome/shared/constants';

export type LogoVariant = 'horizontal' | 'symbol' | 'full' | 'wordmark';
export type LogoTone = 'light' | 'dark' | 'mono-white';

/**
 * Web copies of the official logos (assets/brand/logo), only resized and encoded as WebP by
 * `pnpm brand:assets` — never redrawn or recoloured (11_BRAND_GUIDELINES.md §3).
 */
const files = import.meta.glob<string>('../assets/brand/web/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

const FILE_PREFIX: Record<LogoVariant, string> = {
  horizontal: 'horizontal',
  symbol: 'symbol',
  full: 'logo',
  wordmark: 'wordmark',
};

/** Intrinsic aspect ratio of each variant (from the original PNGs). */
export const LOGO_RATIO: Record<LogoVariant, number> = {
  horizontal: 1557 / 314,
  symbol: 799 / 571,
  full: 1099 / 821,
  wordmark: 1059 / 233,
};

const HEIGHTS = [48, 96, 192] as const;

/** `srcset` with width descriptors so the browser picks the right size for each screen. */
export function logoSources(variant: LogoVariant, tone: LogoTone): { src: string; srcSet: string } {
  const entries = HEIGHTS.map((height) => {
    const url =
      files[`../assets/brand/web/${FILE_PREFIX[variant]}-${tone}-${String(height)}.webp`] ?? '';
    return { url, width: Math.round(LOGO_RATIO[variant] * height) };
  });
  return {
    src: entries[1]?.url ?? '',
    srcSet: entries.map((entry) => `${entry.url} ${String(entry.width)}w`).join(', '),
  };
}

/** C-25 — `light` logo in the light theme, `dark` logo in dark and black. */
export function toneForTheme(theme: Theme): LogoTone {
  return theme === 'light' ? 'light' : 'dark';
}
