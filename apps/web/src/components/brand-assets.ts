import type { Theme } from '@tinhome/shared/constants';
import horizontalDark from '@/assets/brand/tinhome-horizontal-dark.png';
import horizontalLight from '@/assets/brand/tinhome-horizontal-light.png';
import horizontalMono from '@/assets/brand/tinhome-horizontal-mono-white.png';
import fullDark from '@/assets/brand/tinhome-logo-dark.png';
import fullLight from '@/assets/brand/tinhome-logo-light.png';
import fullMono from '@/assets/brand/tinhome-logo-mono-white.png';
import symbolDark from '@/assets/brand/tinhome-symbol-dark.png';
import symbolLight from '@/assets/brand/tinhome-symbol-light.png';
import symbolMono from '@/assets/brand/tinhome-symbol-mono-white.png';
import wordmarkDark from '@/assets/brand/tinhome-wordmark-dark.png';
import wordmarkLight from '@/assets/brand/tinhome-wordmark-light.png';
import wordmarkMono from '@/assets/brand/tinhome-wordmark-mono-white.png';

export type LogoVariant = 'horizontal' | 'symbol' | 'full' | 'wordmark';
export type LogoTone = 'light' | 'dark' | 'mono-white';

/** Official PNGs from assets/brand/logo (11_BRAND_GUIDELINES.md §2) with their intrinsic size. */
export const LOGO_ASSETS: Record<
  LogoVariant,
  { width: number; height: number; src: Record<LogoTone, string> }
> = {
  horizontal: {
    width: 1557,
    height: 314,
    src: { light: horizontalLight, dark: horizontalDark, 'mono-white': horizontalMono },
  },
  symbol: {
    width: 799,
    height: 571,
    src: { light: symbolLight, dark: symbolDark, 'mono-white': symbolMono },
  },
  full: {
    width: 1099,
    height: 821,
    src: { light: fullLight, dark: fullDark, 'mono-white': fullMono },
  },
  wordmark: {
    width: 1059,
    height: 233,
    src: { light: wordmarkLight, dark: wordmarkDark, 'mono-white': wordmarkMono },
  },
};

/** C-25 — `light` logo in the light theme, `dark` logo in dark and black. */
export function toneForTheme(theme: Theme): LogoTone {
  return theme === 'light' ? 'light' : 'dark';
}
