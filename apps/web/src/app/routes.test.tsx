import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoutes } from '@/test/render';
import { buildRoutes } from './routes';

describe('routes', () => {
  it('renders the landing with hero, cities progress and published demand only', async () => {
    renderRoutes(buildRoutes(), '/');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Intercambia tu casa. Viaja por España sin pagar alojamiento.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#main',
    );

    const malaga = await screen.findByRole('progressbar', { name: 'Málaga' });
    expect(malaga).toHaveAttribute('aria-valuenow', '87');
    expect(
      screen.getByText('Málaga abre al llegar a 150 casas verificadas. Vamos por 87.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/personas de Valencia quieren ir a Madrid en Semana Santa 2027/),
    ).toBeInTheDocument();
    // A pair below P-18 (3 people from Málaga) is never shown.
    expect(screen.queryByText(/personas de Málaga quieren ir/)).toBeNull();
  });

  it('links the footer to the legal texts', async () => {
    renderRoutes(buildRoutes(), '/');
    const footer = await screen.findByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'Privacidad' })).toHaveAttribute(
      'href',
      '/legal/privacidad',
    );
    expect(within(footer).getByRole('link', { name: 'Denunciar contenido' })).toBeInTheDocument();
  });

  it('shows the brand page in development', async () => {
    renderRoutes(buildRoutes(), '/dev/brand');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Marca y tokens' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: /Claro|Oscuro|Negro/ })).toHaveLength(3);
  });

  it('shows a friendly 404 for unknown public, app and admin paths', async () => {
    for (const path of ['/no-existe', '/app/no-existe', '/admin/no-existe']) {
      const { unmount } = renderRoutes(buildRoutes(), path);
      expect(
        await screen.findByRole('heading', { name: 'No encontramos esta página' }),
      ).toBeInTheDocument();
      unmount();
    }
  });
});
