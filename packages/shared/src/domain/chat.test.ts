import { describe, expect, it } from 'vitest';
import { matchIdFor, mentionsPayment, minuteBucket, pairKey, whatsappUrl } from './chat.js';

describe('mentionsPayment (FR-60)', () => {
  it('detects Bizum, transfers, IBAN and «pagar»', () => {
    for (const text of [
      'Te hago un Bizum',
      'Mándame una TRANSFERENCIA',
      'Mi IBAN es ES12 3456 7890 1234',
      '¿Cuánto hay que pagar?',
      'Te pago la señal',
    ]) {
      expect(mentionsPayment(text)).toBe(true);
    }
  });

  it('does not flag normal conversation', () => {
    for (const text of [
      '¿Qué fechas os vienen bien?',
      'Mi barrio es muy tranquilo',
      'Página web del museo',
    ]) {
      expect(mentionsPayment(text)).toBe(false);
    }
  });
});

describe('match ids (BR-07)', () => {
  it('orders the pair and numbers rematches', () => {
    expect(pairKey('b', 'a')).toBe('a_b');
    expect(matchIdFor('b', 'a', 0)).toBe('a_b');
    expect(matchIdFor('a', 'b', 2)).toBe('a_b_2');
  });
});

describe('helpers', () => {
  it('builds the minute bucket and the WhatsApp link', () => {
    expect(minuteBucket(new Date('2027-03-01T09:05:59Z'))).toBe('202703010905');
    expect(whatsappUrl('+34612345678')).toBe('https://wa.me/34612345678');
  });
});
