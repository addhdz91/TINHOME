import { expect, test } from '@playwright/test';
import { readDoc, smsCodeFor } from './emulator.js';

/**
 * M4 DoD — an admin (second factor) approves a pending identity and the home becomes visible;
 * every document opening is audited by the server (integration tests check the audit log).
 */
test('an admin with a second factor approves an identity and the home becomes visible', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/entrar?next=%2Fadmin');
  await page.getByLabel('Email').fill('admin@demo.tinhome');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // FR-48 — second factor (SMS in the emulator).
  await page.getByRole('button', { name: 'Enviar código por SMS' }).click();
  await page.getByLabel('Código de 6 cifras').fill(await smsCodeFor('+34600000003'));
  await page.getByRole('button', { name: 'Verificar' }).click();

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  await page.getByRole('link', { name: 'Verificaciones' }).first().click();
  await page
    .getByRole('row', { name: /Marta R\./ })
    .getByRole('link', { name: 'Revisar' })
    .click();
  await expect(page.getByRole('heading', { name: 'Verificación de Marta R.' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'DNI/NIE: anverso' })).toBeVisible();

  expect(await readDoc('homes/demo-marta')).toMatchObject({ visible: false });
  await page.keyboard.press('a');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Estado: Aprobadas')).toBeVisible();
  await expect.poll(async () => (await readDoc('homes/demo-marta')).visible).toBe(true);
});

/** M4 DoD — a reading outside the city radius returns FAIL and the home stays hidden (FR-63). */
test.describe('location outside the city', () => {
  test.use({
    geolocation: { latitude: 39.4699, longitude: -0.3763, accuracy: 20 },
    permissions: ['geolocation'],
  });

  test('a reading from Valencia does not verify a home in Madrid', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel('Email').fill('sofia@demo.tinhome');
    await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/app\//);

    await page.goto('/app/verificacion/ubicacion');
    await page.getByRole('button', { name: 'Verificar ubicación' }).click();
    await expect(page.getByText(/La lectura no coincide con Madrid/)).toBeVisible();
    await expect(page.getByText('Te quedan 4 intentos hoy.')).toBeVisible();
    expect(await readDoc('homes/demo-sofia')).toMatchObject({
      visible: false,
      locationCheck: { status: 'FAIL' },
    });
    await expect(page.getByLabel('Solicitar revisión manual')).toBeVisible();
  });
});
