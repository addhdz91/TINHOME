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

/** M6 DoD — a message reaches the other person in under 1 s (two browsers). */
test('a chat message arrives in real time in the other browser', async ({ browser }) => {
  test.setTimeout(90_000);
  const javier = await signedInPage(browser, 'javier@demo.tinhome');
  const sofia = await signedInPage(browser, 'sofia@demo.tinhome');
  await javier.goto('/app/chats/demo-javier_demo-sofia');
  await sofia.goto('/app/chats/demo-javier_demo-sofia');
  const javierThread = javier.getByRole('list', { name: /Conversación con/ });
  const sofiaThread = sofia.getByRole('list', { name: /Conversación con/ });
  await expect(javierThread.getByText('¡Hola! ¿Qué fechas os vienen bien?')).toBeVisible();
  await expect(sofia.getByRole('heading', { level: 1, name: /Javier/ })).toBeVisible();

  // Warm-up message: production keeps sendMessage warm (minInstances: 1); the emulator does not.
  const warmUp = `Hola, Sofía ${String(Date.now())}`;
  await javier.getByLabel('Escribe un mensaje').fill(warmUp);
  await javier.getByLabel('Escribe un mensaje').press('Enter');
  await expect(sofiaThread.getByText(warmUp)).toBeVisible({ timeout: 10_000 });

  const text = `Semana Santa nos encaja ${String(Date.now())}`;
  await javier.getByLabel('Escribe un mensaje').fill(text);
  await javier.getByLabel('Escribe un mensaje').press('Enter');
  const sentAt = Date.now();
  await expect(javierThread.getByText(text)).toBeVisible();
  await expect(sofiaThread.getByText(text)).toBeVisible({ timeout: 5_000 });
  expect(Date.now() - sentAt).toBeLessThan(1_000);

  // Read receipt for Javier once Sofía has the conversation open.
  await expect(javierThread.getByText('Leído').last()).toBeAttached();
});

test('liking someone who already liked you opens the celebration and the chat', async ({
  page,
}) => {
  await page.goto('/entrar');
  await page.getByLabel('Email').fill('javier@demo.tinhome');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\//);
  await page.goto('/app/me-gusta');
  await expect(page.getByText(/personas? quieren? intercambiar contigo/)).toBeVisible();
  await page.getByRole('button', { name: 'Me gusta' }).first().click();
  const dialog = page.getByRole('dialog', { name: /¡Es un match con / });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('link', { name: 'Enviar mensaje' }).click();
  await expect(page).toHaveURL(/\/app\/chats\//);
  await expect(page.getByText(/Ya podéis hablar/)).toBeVisible();
});
