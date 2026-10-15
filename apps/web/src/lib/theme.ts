import { THEME_PREFERENCES, type Theme, type ThemePreference } from '@tinhome/shared/constants';

/** Same key as the inline script of index.html (11_BRAND_GUIDELINES.md §5). */
export const THEME_STORAGE_KEY = 'tinhome-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value);
}

export function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function storePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode or storage disabled: the choice lasts for this page only.
  }
}

export function systemPrefersDark(): boolean {
  // `window` does not exist while prerendering the landing at build time.
  if (typeof window === 'undefined') return false;
  return window.matchMedia(DARK_QUERY).matches;
}

/** `system` resolves to dark or light following the device (never black). */
export function resolveTheme(preference: ThemePreference, prefersDark: boolean): Theme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

/** Applies the theme to `<html>` and syncs the browser bar colour with the `--bg` token. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === 'light') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  const background = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (!background) return;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = background;
  });
}

/** Subscribes to device theme changes; returns the unsubscribe function. */
export function onSystemThemeChange(listener: (prefersDark: boolean) => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  const handler = (event: MediaQueryListEvent): void => listener(event.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}
