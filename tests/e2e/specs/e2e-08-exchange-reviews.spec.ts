import { expect, test, type Browser, type Page } from '@playwright/test';

async function signedInPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const page = await context.newPage();
  await page.goto('/entrar');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\//);
  return page;
}

async function review(page: Page, stars: string, comment: string) {
  await page.goto('/app/valorar/seed-completed');
  await expect(page.getByText(/Doble ciego/)).toBeVisible();
  await page.getByText(stars, { exact: true }).first().click({ force: true });
  await page.getByRole('button', { name: 'Siguiente' }).click();
  for (const group of ['Limpieza', 'Fidelidad al anuncio', 'Comunicación', 'Cuidado de mi casa']) {
    await page
      .getByRole('group', { name: group })
      .getByText('5 estrellas', { exact: true })
      .click({ force: true });
  }
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('textbox', { name: 'Comentario (opcional)' }).fill(comment);
  await page.getByRole('button', { name: 'Enviar valoración' }).click();
}

/**
 * M8 DoD — declare an exchange from the chat, the other person confirms it (real time), both
 * review a finished exchange (double blind) and the review appears on the home.
 */
test('exchange proposal, confirmation and double-blind reviews', async ({ browser }) => {
  test.setTimeout(120_000);
  const sofia = await signedInPage(browser, 'sofia@demo.tinhome');
  const javier = await signedInPage(browser, 'javier@demo.tinhome');

  // Sofía declares the exchange from the conversation (next-step bar).
  await sofia.goto('/app/chats/demo-javier_demo-sofia');
  await sofia.getByRole('button', { name: 'Declarar intercambio' }).click();
  const sheet = sofia.getByRole('dialog', { name: 'Declarar intercambio con Javier S.' });
  await sheet.getByRole('button', { name: 'Semana Santa 2027' }).click();
  await expect(sheet.getByText(/Del .* · 8 noches/)).toBeVisible();
  await sheet.getByRole('button', { name: 'Enviar a Javier S. para confirmar' }).click();
  await expect(sofia).toHaveURL(/\/app\/intercambios\//);
  await expect(sofia.getByText('Pendiente de confirmar')).toBeVisible();
  const exchangeUrl = sofia.url();

  // Javier gets the notice and confirms from the system message in the chat.
  await javier.goto('/app/avisos');
  await expect(
    javier.getByRole('link', { name: /Sofía N\. te propone un intercambio/ }),
  ).toBeVisible();
  await javier.goto('/app/chats/demo-javier_demo-sofia');
  await javier.getByRole('link', { name: 'Ver intercambio' }).last().click();
  await expect(javier).toHaveURL(exchangeUrl);
  await javier.getByRole('button', { name: 'Confirmar intercambio' }).click();
  await expect(javier.getByText(/^Faltan \d+ días$/)).toBeVisible();
  // Sofía's page updates in real time.
  await expect(sofia.getByText(/^Faltan \d+ días$/)).toBeVisible();

  // Double blind on the seeded finished exchange.
  await review(javier, '5 estrellas', 'Sofía cuidó la casa de maravilla.');
  await expect(javier.getByText(/Se publicará cuando Sofía N\. también valore/)).toBeVisible();
  await review(sofia, '5 estrellas', 'Casa luminosa y Javier muy atento.');
  await expect(sofia.getByText('Las dos valoraciones ya están publicadas.')).toBeVisible();

  await sofia.goto('/app/casa/demo-javier');
  await expect(sofia.getByText('Casa luminosa y Javier muy atento.')).toBeVisible();
});
