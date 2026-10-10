import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\//);
}

/**
 * M5 DoD — with the seed, the deck shows a perfect fit first; the whole flow works with the
 * keyboard (← pass, ↑ detail); passed homes do not come back.
 */
test('Discover: perfect fit first, keyboard navigation and detail', async ({ page }) => {
  await signIn(page, 'javier@demo.tinhome');
  await page.goto('/app/descubrir');
  const firstTitle = page.getByRole('heading', { level: 3 }).first();
  await expect(firstTitle).toBeVisible();
  await expect(page.getByText('Encaje perfecto').first()).toBeVisible();
  const passedTitle = await firstTitle.textContent();

  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { level: 3, name: passedTitle ?? '' })).toHaveCount(0);

  const nextTitle = await page.getByRole('heading', { level: 3 }).first().textContent();
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/\/app\/casa\//);
  await expect(page.getByRole('heading', { level: 1, name: nextTitle ?? '' })).toBeVisible();
  await expect(page.getByText(/^Madrid · /)).toBeVisible();

  // The passed home does not come back after reloading the deck (BR-11).
  await page.goto('/app/descubrir');
  await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: passedTitle ?? '' })).toHaveCount(0);
});

test('Explore: filters and Premium filters for a Premium user', async ({ page }) => {
  await signIn(page, 'javier@demo.tinhome');
  await page.goto('/app/explorar');
  await expect(page.getByRole('link', { name: /en / }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Mascotas' }).click();
  await expect(page.getByRole('button', { name: 'Mascotas' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('link', { name: /en / }).first()).toBeVisible();
  // Javier is Premium: the «Casas Top» collection is unlocked.
  await expect(page.getByRole('button', { name: /Las Casas Top son para Premium/ })).toHaveCount(0);
});
