import { expect, test } from '@playwright/test';
import { smsCodeFor, verifyEmailInEmulator } from './emulator.js';

/**
 * M2 DoD (first part of E2E-02) — sign-up with e-mail → e-mail verification (emulator) →
 * phone with SMS code (emulator) → arrives at onboarding step 3.
 */
test('sign-up, e-mail verification and phone take the user to step 3', async ({ page }) => {
  const stamp = String(Date.now());
  const email = `e2e-${stamp}@ejemplo.es`;
  const mobile = `6${stamp.slice(-8)}`;

  await page.goto('/');
  await page.getByRole('link', { name: 'Crear cuenta gratis' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'Crea tu cuenta' })).toBeVisible();

  await page.getByLabel('Nombre', { exact: true }).fill('Prueba');
  await page.getByLabel('Apellidos').fill('E2E');
  await page.getByLabel('Fecha de nacimiento').fill('1990-05-10');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('casaenruzafa7');
  const submit = page.getByRole('button', { name: 'Crear cuenta' });
  await expect(submit).toBeDisabled();
  await page.getByRole('checkbox', { name: /Acepto los Términos/ }).check();
  await page.getByRole('checkbox', { name: /Política de privacidad/ }).check();
  await submit.click();

  await expect(page.getByRole('heading', { name: 'Revisa tu email' })).toBeVisible();
  await verifyEmailInEmulator(email);
  // The page polls Firebase and moves on by itself.
  await expect(page.getByRole('heading', { name: 'Verifica tu teléfono' })).toBeVisible({
    timeout: 20_000,
  });

  await page.getByLabel('Móvil').fill(mobile);
  await page.getByRole('button', { name: 'Enviar código' }).click();
  const code = await smsCodeFor(`+34${mobile}`);
  await page.getByLabel('Código de 6 cifras').fill(code);
  await page.getByRole('button', { name: 'Verificar' }).click();

  await expect(page).toHaveURL(/\/app\/onboarding\/3$/);
  await expect(page.getByText('Paso 3 de 6').first()).toBeVisible();
});

test('a minor cannot create an account (AC-01.2)', async ({ page }) => {
  await page.goto('/registro');
  await page.getByLabel('Nombre', { exact: true }).fill('Menor');
  await page.getByLabel('Apellidos').fill('E2E');
  await page.getByLabel('Fecha de nacimiento').fill('2015-01-01');
  await page.getByLabel('Email').fill(`menor-${String(Date.now())}@ejemplo.es`);
  await page.getByLabel('Contraseña', { exact: true }).fill('casaenruzafa7');
  await page.getByRole('checkbox', { name: /Acepto los Términos/ }).check();
  await page.getByRole('checkbox', { name: /Política de privacidad/ }).check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Debes ser mayor de edad para usar TinHome.')).toBeVisible();
  await expect(page).toHaveURL(/\/registro$/);
});

test('demo user signs in and lands on the onboarding step saved on the server', async ({
  page,
}) => {
  await page.goto('/entrar');
  await page.getByLabel('Email').fill('laura@demo.tinhome');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding\/3$/);
});

test('the re-acceptance modal blocks until the new Terms are accepted (FR-58)', async ({
  page,
}) => {
  await page.goto('/entrar');
  await page.getByLabel('Email').fill('marta@demo.tinhome');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Hemos actualizado nuestras condiciones' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await expect(dialog).toBeHidden();
});
