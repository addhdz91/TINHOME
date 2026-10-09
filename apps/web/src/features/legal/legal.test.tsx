import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoutes } from '@/test/render';
import { legalRoutes } from './routes';

describe('LegalPage', () => {
  it('renders the current version with its date and without raw HTML or unsafe links', async () => {
    const { container } = renderRoutes(legalRoutes, '/legal/privacidad');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Política de privacidad' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Versión 0\.1-provisional · 9 de octubre de 2026/)).toBeInTheDocument();
    expect(screen.getByText('PROVISIONAL')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.queryByRole('link', { name: 'enlace' })).toBeNull();
    expect(screen.getByRole('link', { name: 'web' })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows a not-found state for unknown or unpublished slugs', async () => {
    renderRoutes(legalRoutes, '/legal/inventado');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No encontramos este texto legal' }),
    ).toBeInTheDocument();
  });

  it('shows a not-found state for a known slug without document', async () => {
    renderRoutes(legalRoutes, '/legal/cookies');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No encontramos este texto legal' }),
    ).toBeInTheDocument();
  });
});
