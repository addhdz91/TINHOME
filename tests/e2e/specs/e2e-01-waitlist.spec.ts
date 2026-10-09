import { expect, test } from '@playwright/test';
import { confirmUrlFor } from './emulator.js';

/** E2E-01 — Visitor → waitlist → confirms → sees their city progress. */
test('a visitor joins the waitlist, confirms by e-mail and sees their city', async ({ page }) => {
  const email = `e2e-${String(Date.now())}@ejemplo.es`;

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Intercambia tu casa. Viaja por España sin pagar alojamiento.',
  );
  await page.getByRole('link', { name: 'Apúntate a la lista de espera' }).first().click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Apúntate a la lista de espera' }),
  ).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Tu ciudad').selectOption('malaga');
  await page.getByRole('checkbox', { name: 'Madrid' }).check();
  await page.getByRole('checkbox', { name: 'Semana Santa 2027' }).check();
  await page.getByRole('checkbox', { name: /política de privacidad/ }).check();
  await page.getByRole('button', { name: 'Apuntarme' }).click();

  await expect(page.getByRole('heading', { name: 'Revisa tu email' })).toBeVisible();

  // The e-mail goes to the console provider; the link is read from mailQueue.
  const confirmUrl = await confirmUrlFor(email);
  await page.goto(new URL(confirmUrl).pathname + new URL(confirmUrl).search);

  await expect(page.getByRole('heading', { name: '¡Ya estás en la lista!' })).toBeVisible();
  await expect(page.getByText(/Eres la persona n\.º \d+ en la lista de Málaga\./)).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Málaga' })).toBeVisible();
  // The token does not stay in the address bar.
  expect(page.url()).not.toContain('token=');
});

test('the pricing page shows VAT-inclusive prices from config/public', async ({ page }) => {
  await page.goto('/precios');
  await expect(page.getByText(/9,99\s€ al mes/)).toBeVisible();
  await expect(page.getByText(/IVA incluido/)).toBeVisible();
});

test('legal texts render as Markdown with version', async ({ page }) => {
  await page.goto('/legal/privacidad');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Política de privacidad' }),
  ).toBeVisible();
  await expect(page.getByText(/Versión 0\.1-provisional/)).toBeVisible();
});
