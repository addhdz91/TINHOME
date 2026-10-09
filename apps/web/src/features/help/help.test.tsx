import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PUBLIC_DOCS } from '@/test/public-data';
import { renderRoutes } from '@/test/render';
import { helpRoutes } from './routes';

PUBLIC_DOCS['faqs/como-funciona-la-verificacion'] = {
  category: 'VERIFICATION',
  question: '¿Cómo funciona la verificación?',
  answerMarkdown: 'Una persona del equipo revisa tu **documento**.',
  order: 1,
  published: true,
  tags: ['identidad', 'dni'],
};
PUBLIC_DOCS['faqs/premium-y-pagos'] = {
  category: 'PREMIUM_PAYMENTS',
  question: '¿Cuánto cuesta Premium?',
  answerMarkdown: 'Puedes cancelar cuando quieras.',
  order: 2,
  published: true,
  tags: [],
};

const routes = helpRoutes.map((r) => ({ ...r, path: `/${r.path ?? ''}` }));

describe('HelpCenter (FR-66)', () => {
  it('lists quick links and categories', async () => {
    renderRoutes(routes, '/ayuda');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ayuda' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Verificación' })).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: '¿Cómo funciona la verificación?' })[0],
    ).toHaveAttribute('href', '/ayuda/como-funciona-la-verificacion');
  });

  it('searches instantly, ignoring accents', async () => {
    const user = userEvent.setup();
    renderRoutes(routes, '/ayuda');
    await user.type(
      await screen.findByRole('searchbox', { name: 'Buscar en la ayuda' }),
      'verificacion',
    );
    expect(await screen.findByText('1 resultados')).toBeInTheDocument();
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'zzzz');
    expect(await screen.findByText(/No hay resultados/)).toBeInTheDocument();
  });

  it('renders an article as safe Markdown', async () => {
    renderRoutes(routes, '/ayuda/como-funciona-la-verificacion');
    expect(
      await screen.findByRole('heading', { level: 1, name: '¿Cómo funciona la verificación?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('documento').tagName).toBe('STRONG');
  });

  it('shows not-found for an unknown article', async () => {
    renderRoutes(routes, '/ayuda/no-existe');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No encontramos este artículo' }),
    ).toBeInTheDocument();
  });
});
