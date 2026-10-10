import { randomBytes } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Random-noise RGB PNG: every photo gets a different dHash, so no duplicate hold (FR-64). */
function noisePng(width = 320, height = 240): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // RGB
  const rows = Array.from({ length: height }, () =>
    Buffer.concat([Buffer.from([0]), randomBytes(width * 3)]),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * M3 DoD (second part of E2E-02) — a user creates the home, uploads 5 photos (Storage trigger),
 * sets the trip, postpones verification and publishes: the home is published but not visible
 * until identity and location are verified (BR-04).
 */
test('a user publishes the home with 5 photos', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/entrar');
  await page.getByLabel('Email').fill('pablo@demo.tinhome');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding\/3$/);

  // Mobile-first (CLAUDE.md §4.5): long option texts must not widen the page.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // 3a — basic data.
  await page.getByLabel('Ciudad').selectOption('madrid');
  await page.getByLabel('Barrio o zona').fill('Chamberí');
  await page.getByLabel('Metros cuadrados').fill('70');
  await page.getByLabel('Personas que caben').fill('3');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();

  // 3b — photos, processed by the Storage trigger.
  await expect(page.getByRole('heading', { name: 'Fotos de tu casa' })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(
    Array.from({ length: 5 }, (_, i) => ({
      name: `foto-${String(i + 1)}.png`,
      mimeType: 'image/png',
      buffer: noisePng(),
    })),
  );
  await expect(page.getByText('5 de 20 fotos')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Continuar' }).click();

  // 3c — texts: a phone number is rejected by the server (BR-22).
  await page.getByLabel('Título').fill('Piso tranquilo en Chamberí');
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Piso tranquilo y luminoso cerca del metro. Llámame al 612345678 para hablar.');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page.getByText(/No incluyas teléfonos, emails, enlaces ni precios/)).toBeVisible();
  await page
    .getByLabel('Descripción', { exact: true })
    .fill('Piso tranquilo y luminoso cerca del metro, con parques y mercados para pasear.');
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();

  // 4 — trip.
  await expect(page).toHaveURL(/\/app\/onboarding\/4$/);
  await page.getByRole('checkbox', { name: 'Valencia' }).check();
  await page.getByRole('checkbox', { name: /Semana Santa 2027/ }).check();
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();

  // 5 — verification later; 6 — publish.
  await expect(page).toHaveURL(/\/app\/onboarding\/5$/);
  await page.getByRole('button', { name: 'Hacerlo después y revisar' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding\/6$/);
  await page.getByRole('checkbox', { name: /declaración responsable/ }).check();
  await page.getByRole('button', { name: 'Publicar mi casa' }).click();
  await expect(page.getByRole('heading', { name: '¡Tu casa está publicada!' })).toBeVisible();
  await expect(page.getByText('Falta verificar tu identidad.')).toBeVisible();
});
