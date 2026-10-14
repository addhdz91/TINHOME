import { expect, test } from '@playwright/test';
import { readDoc, smsCodeFor } from './emulator.js';

/**
 * M9 DoD — a report «Fotos que no son de su vivienda» from a verified user hides the home at
 * once and alerts the admins in real time; the admin reviews it and dismissing frees the home.
 */
test('a serious report hides the home at once; the admin sees the alert and dismisses it', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const javier = await context.newPage();
  await javier.goto('/entrar');
  await javier.getByLabel('Email').fill('javier@demo.tinhome');
  await javier.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await javier.getByRole('button', { name: 'Entrar' }).click();
  await expect(javier).toHaveURL(/\/app\//);

  await javier.goto('/app/casa/seed-owner-01');
  await expect(javier.getByRole('heading', { level: 1 })).toBeVisible();
  await javier.getByRole('button', { name: 'Denunciar esta casa' }).click();
  const dialog = javier.getByRole('dialog');
  await dialog
    .getByRole('radio', { name: 'Fotos que no son de su vivienda o suplantación de otra casa' })
    .check();
  await dialog
    .getByRole('textbox', { name: '¿Qué ha pasado?' })
    .fill('Las fotos son de un anuncio de otra web, no de esta casa.');
  await dialog.getByRole('button', { name: 'Enviar denuncia' }).click();
  await expect(javier.getByText(/Hemos recibido tu denuncia/)).toBeVisible();
  await expect.poll(async () => (await readDoc('homes/seed-owner-01')).visible).toBe(false);

  // Admin with a second factor: the alert is there in real time.
  const admin = await (await browser.newContext({ locale: 'es-ES' })).newPage();
  await admin.goto('/entrar?next=%2Fadmin');
  await admin.getByLabel('Email').fill('admin@demo.tinhome');
  await admin.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await admin.getByRole('button', { name: 'Entrar' }).click();
  await admin.getByRole('button', { name: 'Enviar código por SMS' }).click();
  await admin.getByLabel('Código de 6 cifras').fill(await smsCodeFor('+34600000003'));
  await admin.getByRole('button', { name: 'Verificar' }).click();
  await expect(admin.getByRole('heading', { name: 'Inicio' })).toBeVisible();

  await admin
    .getByRole('link', { name: /^Alertas/ })
    .first()
    .click();
  const alert = admin.getByRole('listitem').filter({ hasText: 'Denuncia de prioridad alta' });
  await expect(alert).toBeVisible();
  await alert.getByRole('link', { name: 'Abrir' }).click();
  await expect(
    admin.getByRole('heading', { level: 1, name: /Fotos que no son de su vivienda/ }),
  ).toBeVisible();
  await expect(admin.getByText(/En retención preventiva/)).toBeVisible();
  await admin.getByRole('button', { name: 'Aplicar decisión' }).click();
  await expect(admin).toHaveURL(/\/admin\/denuncias$/);
  await expect.poll(async () => (await readDoc('homes/seed-owner-01')).visible).toBe(true);
});
