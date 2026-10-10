import { describe, expect, it } from 'vitest';
import { dhashBands, dhashFromPixels, hammingDistance } from './dhash.js';

const gradient = Array.from({ length: 72 }, (_, i) => (i % 9) * 20);

describe('T-D16 · dHash', () => {
  it('computes a 64-bit hash from 9×8 pixels', () => {
    const decreasing = Array.from({ length: 72 }, (_, i) => 200 - (i % 9) * 20);
    expect(dhashFromPixels(gradient)).toBe('0000000000000000');
    expect(dhashFromPixels(decreasing)).toBe('ffffffffffffffff');
    expect(() => dhashFromPixels([1, 2, 3])).toThrow();
  });

  it('measures Hamming distance', () => {
    expect(hammingDistance('0000000000000000', '0000000000000000')).toBe(0);
    expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64);
    expect(hammingDistance('00000000000000ff', '000000000000000f')).toBe(4);
  });

  it('finds every pair within distance 7 through a shared band (pigeonhole)', () => {
    const base = 'a1b2c3d4e5f60718';
    // Flip one bit in 7 different bands: the 8th band is still identical.
    let other = BigInt(`0x${base}`);
    for (let band = 0; band < 7; band += 1) other ^= 1n << BigInt(band * 8);
    const near = other.toString(16).padStart(16, '0');
    expect(hammingDistance(base, near)).toBe(7);
    const shared = dhashBands(base).filter((band) => dhashBands(near).includes(band));
    expect(shared.length).toBeGreaterThanOrEqual(1);
    expect(dhashBands(base)).toHaveLength(8);
    expect(dhashBands(base)[0]).toBe('0_a1');
  });
});
