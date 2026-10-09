/**
 * Generates web-sized WebP copies of the official logos for the interface.
 *
 * The originals in `assets/brand/logo/` are never modified: this script only resizes and
 * re-encodes them (no redrawing, no recolouring — 11_BRAND_GUIDELINES.md §3). The PNGs are
 * 1000–1600 px wide while the UI shows them at 24–120 px, which costs ~200 KB per logo on
 * mobile (Lighthouse, M1). Decision recorded in docs/10_DECISIONS_AND_OPEN_ITEMS.md §5.
 *
 * Usage: `pnpm brand:assets` (re-run whenever assets/brand/logo changes).
 */
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'assets/brand/logo');
const target = resolve(root, 'apps/web/src/assets/brand/web');

const VARIANTS = ['logo', 'horizontal', 'symbol', 'wordmark'] as const;
const TONES = ['light', 'dark', 'mono-white'] as const;
/** Rendered heights × 1, 2 and 3 (device pixel ratio) cover every size used in the UI. */
const HEIGHTS = [48, 96, 192] as const;

async function main(): Promise<void> {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const variant of VARIANTS) {
    for (const tone of TONES) {
      const input = resolve(source, `tinhome-${variant}-${tone}.png`);
      for (const height of HEIGHTS) {
        const output = resolve(target, `${variant}-${tone}-${String(height)}.webp`);
        await sharp(input)
          .resize({ height, withoutEnlargement: true })
          .webp({ quality: 90, alphaQuality: 100, effort: 6 })
          .toFile(output);
      }
    }
  }
  console.log(
    `✔ ${String(VARIANTS.length * TONES.length * HEIGHTS.length)} WebP logos in ${target}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
