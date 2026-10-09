import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoutes } from '@/test/render';
import { pricingRoutes } from './routes';

describe('PricingPage', () => {
  it('shows prices from config/public with VAT and the comparison table', async () => {
    renderRoutes(pricingRoutes, '/precios');
    expect(await screen.findByText(/^9,99\s€ al mes$/)).toBeInTheDocument();
    expect(screen.getByText(/o 79,00\s€ al año · IVA incluido/)).toBeInTheDocument();
    expect(screen.getByText('Ahorras un 34 % con el plan anual')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Comparativa de ventajas Gratis y Premium' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Me gusta al día' })).toBeInTheDocument();
    expect(screen.getByText('10 al día')).toBeInTheDocument();
    expect(
      screen.getByText('Tienes 14 días para desistir de la contratación.'),
    ).toBeInTheDocument();
  });
});
