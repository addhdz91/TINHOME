import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';
import { buildRoutes } from './routes';
import { ThemeProvider } from './ThemeProvider';

function renderAt(path: string) {
  const router = createMemoryRouter(buildRoutes(), { initialEntries: [path] });
  render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
}

describe('routes', () => {
  it('renders the public landing placeholder', async () => {
    renderAt('/');
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
  });

  it('shows the brand page in development', async () => {
    renderAt('/dev/brand');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Marca y tokens' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: /Claro|Oscuro|Negro/ })).toHaveLength(3);
  });

  it('shows a friendly 404 for unknown public, app and admin paths', async () => {
    for (const path of ['/no-existe', '/app/no-existe', '/admin/no-existe']) {
      renderAt(path);
      expect(
        await screen.findByRole('heading', { name: 'No encontramos esta página' }),
      ).toBeInTheDocument();
      document.body.innerHTML = '';
    }
  });
});
