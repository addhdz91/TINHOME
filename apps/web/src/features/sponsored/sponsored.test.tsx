import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import { SponsoredCard } from './components/SponsoredCard';

describe('SponsoredCard (BR-28)', () => {
  it('is always labelled and links through the own redirect without referrer', () => {
    render(
      <SponsoredCard
        card={{
          partnerId: 'p1',
          title: 'Limpieza',
          text: 'Deja la casa lista.',
          logoUrl: '/icons/icon-192.png',
          clickUrl: '/r/p1?p=MATCH',
          label: 'Patrocinado',
        }}
      />,
    );
    expect(screen.getByRole('complementary', { name: 'Patrocinado' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Ver oferta de Limpieza/ });
    expect(link).toHaveAttribute('href', '/r/p1?p=MATCH');
    expect(link).toHaveAttribute('rel', 'sponsored noopener noreferrer');
  });
});
