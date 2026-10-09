import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/app/ThemeProvider';

/** Renders inside the providers every component expects. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
