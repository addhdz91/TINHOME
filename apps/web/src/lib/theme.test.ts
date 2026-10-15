import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  isThemePreference,
  readStoredPreference,
  resolveTheme,
  storePreference,
  THEME_STORAGE_KEY,
} from './theme';

describe('theme', () => {
  it('resolves system to light or dark, never black', () => {
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('black', false)).toBe('black');
  });

  it('reads only valid stored preferences', () => {
    expect(readStoredPreference()).toBe('system');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readStoredPreference()).toBe('system');
    storePreference('dark');
    expect(readStoredPreference()).toBe('dark');
    expect(isThemePreference('black')).toBe(true);
  });

  it('sets data-theme except for light', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('syncs every theme-color meta with the --bg token', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.media = '(prefers-color-scheme: light)';
    document.head.appendChild(meta);
    document.documentElement.style.setProperty('--bg', 'rgb(0, 0, 0)');
    applyTheme('black');
    expect(meta.content).toBe('rgb(0, 0, 0)');
    document.documentElement.style.removeProperty('--bg');
    meta.remove();
  });
});
