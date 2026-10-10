import { describe, expect, it } from 'vitest';
import { validateListingText } from './text-validation.js';

const reasons = (text: string) => {
  const result = validateListingText(text);
  return result.ok ? [] : result.error;
};

describe('T-D06 · BR-22 validateListingText', () => {
  it('detects phones written with spaces, dots or prefix', () => {
    expect(reasons('Llámame al 612 345 678')).toContain('PHONE');
    expect(reasons('tel 612.345.678')).toContain('PHONE');
    expect(reasons('+34 612345678')).toContain('PHONE');
  });

  it('detects e-mails, including obfuscated ones, and URLs', () => {
    expect(reasons('escribe a laura@ejemplo.es')).toEqual(expect.arrayContaining(['EMAIL']));
    expect(reasons('laura arroba ejemplo punto es')).toContain('EMAIL');
    expect(reasons('mira www.micasa.com')).toContain('URL');
    expect(reasons('https://x.y/z')).toContain('URL');
  });

  it('detects prices and rental vocabulary, ignoring accents and case', () => {
    expect(reasons('Solo 50 €/noche')).toEqual(expect.arrayContaining(['PRICE', 'RENTAL']));
    expect(reasons('ALQUILO mi piso')).toContain('RENTAL');
    expect(reasons('Se alquila por días')).toContain('RENTAL');
    expect(reasons('pago por bizum')).toContain('RENTAL');
    expect(reasons('precio a convenir')).toContain('PRICE');
  });

  it('has no false positives on normal descriptions', () => {
    expect(
      reasons('Piso luminoso con 2 dormitorios, a 300 m de la playa y 10 minutos del centro.'),
    ).toEqual([]);
    expect(reasons('Casa de 120 m2 construida en 1985, planta 3.')).toEqual([]);
    expect(reasons('Ideal para familias; admite mascotas.')).toEqual([]);
  });
});
