import { randomUUID } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import { dhashFromPixels } from '@tinhome/shared/domain';

/** Same sizes as `processHomePhoto` (03 §6). */
const SIZES = { thumb: 400, card: 1080, full: 1600 } as const;
const POOL_SIZE = 15;

export interface SeedPhoto {
  id: string;
  order: number;
  thumbUrl: string;
  cardUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  dhash: string;
}

/** Abstract «room» illustration (wall, floor, window, sofa); no real homes or people. */
function roomSvg(index: number): string {
  const hue = (index * 47) % 360;
  const wall = `hsl(${hue} 35% 88%)`;
  const floor = `hsl(${(hue + 30) % 360} 30% 62%)`;
  const sky = `hsl(${(hue + 180) % 360} 70% 78%)`;
  const sofa = `hsl(${(hue + 200) % 360} 40% 45%)`;
  const windowX = 120 + ((index * 83) % 420);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <rect width="1080" height="900" fill="${wall}"/>
  <rect y="900" width="1080" height="450" fill="${floor}"/>
  <rect x="${windowX}" y="180" width="420" height="460" rx="12" fill="${sky}" stroke="white" stroke-width="18"/>
  <line x1="${windowX + 210}" y1="180" x2="${windowX + 210}" y2="640" stroke="white" stroke-width="12"/>
  <rect x="160" y="760" width="760" height="220" rx="40" fill="${sofa}"/>
  <rect x="200" y="700" width="320" height="120" rx="30" fill="${sofa}" opacity="0.85"/>
  <rect x="560" y="700" width="320" height="120" rx="30" fill="${sofa}" opacity="0.85"/>
</svg>`;
}

function url(bucket: string, path: string, token: string): string {
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199';
  return `http://${host}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * Uploads a small pool of illustrations to the Storage emulator (`seed/photos/`) and returns
 * them; demo homes reuse the pool, so the seed stays fast even with 60 homes.
 */
export async function uploadPhotoPool(bucketName: string): Promise<Omit<SeedPhoto, 'order'>[]> {
  const bucket = getStorage().bucket(bucketName);
  const pool: Omit<SeedPhoto, 'order'>[] = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    const svg = Buffer.from(roomSvg(index));
    const urls: Partial<Record<keyof typeof SIZES, string>> = {};
    let dhash = '';
    for (const [size, width] of Object.entries(SIZES) as [keyof typeof SIZES, number][]) {
      const path = `seed/photos/${String(index)}_${size}.webp`;
      const token = randomUUID();
      const data = await sharp(svg).resize({ width }).webp({ quality: 70 }).toBuffer();
      await bucket.file(path).save(data, {
        contentType: 'image/webp',
        metadata: { metadata: { firebaseStorageDownloadTokens: token } },
      });
      urls[size] = url(bucketName, path, token);
      // Same as `computeDhash` in functions: re-uploading this file triggers FR-64.
      if (size === 'full') {
        dhash = dhashFromPixels(
          await sharp(data).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer(),
        );
      }
    }
    pool.push({
      id: `seed${String(index)}`,
      thumbUrl: urls.thumb ?? '',
      cardUrl: urls.card ?? '',
      fullUrl: urls.full ?? '',
      width: 1080,
      height: 1350,
      dhash,
    });
  }
  return pool;
}

/** `count` photos for the n-th home, rotating through the pool. */
export function photosFor(
  pool: readonly Omit<SeedPhoto, 'order'>[],
  homeIndex: number,
  count: number,
): SeedPhoto[] {
  return Array.from({ length: count }, (_, order) => {
    const photo = pool[(homeIndex * 3 + order) % pool.length];
    if (!photo) throw new Error('Empty photo pool');
    return { ...photo, id: `${photo.id}-${String(order)}`, order };
  });
}
