import { expect, test } from '@playwright/test';

/**
 * M7 DoD — subscribe (simulated checkout in the emulator), cancel at the end of the period from the
 * (simulated) portal while keeping Premium, and withdraw with re-authentication (FR-36/37/38).
 */
test('Premium: checkout, cancel at period end and withdrawal', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/entrar');
  await page.getByLabel('Email').fill('sofia@demo.tinhome');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\//);

  await page.goto('/app/premium');
  const pay = page.getByRole('button', { name: 'Continuar al pago seguro' });
  await expect(pay).toBeDisabled();
  await page.getByRole('radio', { name: /Mensual/ }).check();
  await page.getByRole('checkbox', { name: /empezar a usar Premium ahora/ }).check();
  await pay.click();

  await expect(page.getByText('¡Listo! Tu Premium ya está activo.')).toBeVisible();
  await expect(page.getByText('Tu Premium está activo')).toBeVisible();
  await expect(page.getByText('Mensual')).toBeVisible();

  await page.getByRole('button', { name: 'Gestionar suscripción' }).click();
  await expect(page).toHaveURL(/\/app\/premium\/portal-simulado/);
  await page.getByRole('button', { name: 'Cancelar al final del periodo' }).click();
  await expect(page.getByText('Evento simulado aplicado.')).toBeVisible();
  await page.getByRole('link', { name: 'Volver a Premium' }).click();
  await expect(page.getByText(/Has cancelado la renovación/)).toBeVisible();
  await expect(page.getByText('Tu Premium está activo')).toBeVisible();

  await page.getByRole('button', { name: 'Desistir de la suscripción' }).click();
  const dialog = page.getByRole('dialog', { name: 'Desistir de Premium' });
  await dialog.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await dialog.getByRole('button', { name: 'Confirmar desistimiento' }).click();
  await expect(page.getByText(/Has desistido\. Te devolveremos/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar al pago seguro' })).toBeVisible();
});
