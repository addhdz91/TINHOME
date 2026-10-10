import sharp from 'sharp';

/** Distinct test pictures (stripes at different angles/colours) as JPEG, optionally with EXIF+GPS. */
export async function testJpeg(
  seed: number,
  options: { width?: number; exif?: boolean } = {},
): Promise<Buffer> {
  const width = options.width ?? 1200;
  const height = Math.round(width * 0.75);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="${String((seed % 3) + 1)}" y2="${String(seed % 2)}">
      <stop offset="0" stop-color="hsl(${String(seed * 47)},70%,30%)"/><stop offset="1" stop-color="hsl(${String(seed * 91)},60%,80%)"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${Array.from({ length: 6 }, (_, i) => `<rect x="${String((i * 97 + seed * 31) % width)}" y="${String((i * 53 + seed * 17) % height)}" width="${String(width / 5)}" height="${String(height / 7)}" fill="hsl(${String((seed + i) * 60)},80%,50%)"/>`).join('')}
  </svg>`;
  let image = sharp(Buffer.from(svg)).jpeg({ quality: 90 });
  if (options.exif) {
    image = image.withExif({
      IFD0: { Copyright: 'Laura', Artist: 'Laura García' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '40/1 25/1 0/1',
        GPSLongitudeRef: 'W',
        GPSLongitude: '3/1 42/1 0/1',
      },
    });
  }
  return image.toBuffer();
}
