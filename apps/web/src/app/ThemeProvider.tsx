import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemePreference } from '@tinhome/shared/constants';
import {
  applyTheme,
  onSystemThemeChange,
  readStoredPreference,
  resolveTheme,
  storePreference,
  systemPrefersDark,
} from '@/lib/theme';
import { ThemeContext, type ThemeContextValue } from './theme-context';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * C-26 support: keeps `<html data-theme>` in sync with the preference. The first paint is
 * already themed by the inline script of index.html, so there is no flash on reload.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [prefersDark, setPrefersDark] = useState<boolean>(systemPrefersDark);

  useEffect(() => onSystemThemeChange(setPrefersDark), []);

  const theme = resolveTheme(preference, prefersDark);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // TODO(M2): also persist with `updateSettings` when signed in (users.settings.theme).
  const setPreference = useCallback((next: ThemePreference) => {
    storePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, setPreference }),
    [preference, theme, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
