import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\//);
}

/** M9 DoD — FR-59: download my data (re-authenticated) and a GDPR request; BR-29: deletion. */
test('Privacy: data download, GDPR request and account deletion', async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, 'javier@demo.tinhome');
  await page.goto('/app/privacidad');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Privacidad y mis datos' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Descargar mis datos' }).click();
  const dialog = page.getByRole('dialog', { name: 'Descargar mis datos' });
  await dialog.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await dialog.getByRole('button', { name: 'Generar descarga' }).click();
  await expect(page.getByText(/Tu archivo está listo/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Descargar archivo' }).click();
  expect((await download).suggestedFilename()).toBe('tinhome-mis-datos.json');

  await page.getByText('Nueva solicitud').click();
  await page.getByLabel('Derecho que quieres ejercer').selectOption('RECTIFICATION');
  await page
    .getByLabel('Cuéntanos qué necesitas')
    .fill('Mi apellido está mal escrito en el perfil.');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByText(/Solicitud registrada/)).toBeVisible();
  await expect(page.getByText('Rectificación · En curso')).toBeVisible();

  await page.goto('/app/perfil');
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  await signIn(page, 'pablo@demo.tinhome');
  await page.goto('/app/baja');
  const next = page.getByRole('button', { name: 'Continuar' });
  await expect(next).toBeDisabled();
  await page.getByLabel('Escribe ELIMINAR para confirmar').fill('ELIMINAR');
  await next.click();
  const reauth = page.getByRole('dialog', { name: 'Confirma que eres tú' });
  await reauth.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await reauth.getByRole('button', { name: 'Dar de baja mi cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Solicitud de baja recibida' })).toBeVisible();
  await expect(page.getByText(/Tus datos personales y fotos se borrarán el/)).toBeVisible();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/localhost:5173\/$/);
});
