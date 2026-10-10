/**
 * FR-64 / ADR-022 — perceptual difference hash (dHash, 64 bits) and its band index.
 * The image is resized to 9×8 greyscale elsewhere (sharp); this file is pure.
 */

/** dHash from 72 greyscale pixels (9 wide × 8 high, row-major) → 16 hex characters. */
export function dhashFromPixels(pixels: ArrayLike<number>): string {
  if (pixels.length !== 72) throw new Error('dhash needs 9×8 pixels');
  let bits = 0n;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const left = pixels[row * 9 + col] ?? 0;
      const right = pixels[row * 9 + col + 1] ?? 0;
      bits = (bits << 1n) | (left > right ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, '0');
}

/** Number of different bits between two 64-bit hashes (hex). */
export function hammingDistance(a: string, b: string): number {
  let diff = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (diff > 0n) {
    count += Number(diff & 1n);
    diff >>= 1n;
  }
  return count;
}

/**
 * 8 bands of 8 bits (`photoHashIndex/{band}_{value}`). Two hashes within Hamming distance ≤ 7
 * always share at least one identical band (pigeonhole), so looking up the 8 bands finds
 * every candidate for P-36 ≤ 7.
 */
export function dhashBands(hash: string): string[] {
  return Array.from(
    { length: 8 },
    (_, band) => `${String(band)}_${hash.slice(band * 2, band * 2 + 2)}`,
  );
}
