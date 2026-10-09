import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { renderWithProviders } from '@/test/render';
import { ThemeSwitcher } from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
  it('offers the four options with System selected by default', () => {
    renderWithProviders(<ThemeSwitcher />);
    const group = screen.getByRole('radiogroup', { name: 'Tema' });
    expect(group).toBeInTheDocument();
    for (const name of ['Sistema', 'Claro', 'Oscuro', 'Negro']) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeChecked();
  });

  it('applies and stores the chosen theme', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeSwitcher />);

    await user.click(screen.getByRole('radio', { name: 'Negro' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'black');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('black');

    await user.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('is operable with the keyboard', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    renderWithProviders(<ThemeSwitcher />);

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Claro' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toHaveFocus();
    // Browsers also select on arrow focus; jsdom needs the explicit Space.
    await user.keyboard(' ');
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
