import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { renderWithProviders } from '@/test/render';
import { TinHomeLogo } from './TinHomeLogo';

describe('TinHomeLogo', () => {
  it('uses the light variant in the light theme with an accessible name', () => {
    renderWithProviders(<TinHomeLogo />);
    const logo = screen.getByRole('img', { name: 'TinHome' });
    expect(logo).toHaveAttribute('data-tone', 'light');
    expect(logo.getAttribute('src')).toContain('horizontal-light');
    expect(logo.getAttribute('srcset')).toMatch(
      /horizontal-light-48\.webp 238w, .*-96\.webp 476w, .*-192\.webp 952w/,
    );
  });

  it.each(['dark', 'black'] as const)('uses the dark variant in the %s theme', (theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    renderWithProviders(<TinHomeLogo variant="symbol" />);
    const logo = screen.getByRole('img', { name: 'TinHome' });
    expect(logo).toHaveAttribute('data-tone', 'dark');
    expect(logo.getAttribute('src')).toContain('symbol-dark');
  });

  it('honours an explicit tone and keeps the aspect ratio', () => {
    renderWithProviders(<TinHomeLogo variant="horizontal" tone="mono-white" height={40} />);
    const logo = screen.getByRole('img');
    expect(logo.getAttribute('src')).toContain('horizontal-mono-white');
    expect(logo).toHaveAttribute('height', '40');
    expect(logo).toHaveAttribute('width', String(Math.round((1557 / 314) * 40)));
  });

  it('is hidden from assistive tech when decorative', () => {
    renderWithProviders(<TinHomeLogo decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    act(() => undefined);
  });
});
