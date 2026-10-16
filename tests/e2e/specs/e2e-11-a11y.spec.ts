import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { smsCodeFor } from './emulator.js';

/**
 * M10 / 09 §4 — axe: no serious or critical WCAG 2.2 AA violations on every screen and in the
 * three themes (light, dark, black). The theme is switched on <html> after the page loads.
 */
const THEMES = ['light', 'dark', 'black'] as const;

async function audit(page: Page, path: string, ready: () => Promise<void>) {
  await page.goto(path);
  await ready();
  const problems: string[] = [];
  for (const theme of THEMES) {
    await page.evaluate((value) => {
      if (value === 'light') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', value);
    }, theme);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    for (const violation of result.violations) {
      if (violation.impact !== 'serious' && violation.impact !== 'critical') continue;
      const targets = violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(' '))
        .join(' | ');
      problems.push(`${path} [${theme}] ${violation.id}: ${targets}`);
    }
  }
  expect(problems, problems.join('\n')).toEqual([]);
}

const h1 = (page: Page) => () => expect(page.locator('h1').first()).toBeVisible();

async function signIn(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app\//);
}

test('a11y: public pages', async ({ page }) => {
  test.setTimeout(120_000);
  for (const path of [
    '/',
    '/como-funciona',
    '/precios',
    '/ayuda',
    '/legal/terminos',
    '/entrar',
    '/registro',
    '/reclamaciones',
    '/denunciar',
    '/recuperar',
    '/lista-espera',
  ]) {
    await audit(page, path, h1(page));
  }
});

test('a11y: signed-in screens', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page, 'javier@demo.tinhome');
  for (const path of [
    '/app/descubrir',
    '/app/explorar',
    '/app/chats',
    '/app/intercambios',
    '/app/avisos',
    '/app/perfil',
    '/app/premium',
    '/app/invita',
    '/app/mi-cuenta',
    '/app/soporte',
    '/app/privacidad',
    '/app/baja',
    '/app/mi-casa',
    '/app/viaje',
    '/app/me-gusta',
    '/app/bloqueados',
    '/app/verificacion',
    '/app/soporte/nueva',
    '/app/casa/seed-owner-01',
    '/app/valorar/seed-completed',
  ]) {
    await audit(page, path, h1(page));
  }
});

test('a11y: admin panel', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/entrar?next=%2Fadmin');
  await page.getByLabel('Email').fill('admin@demo.tinhome');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo1234!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Enviar código por SMS' }).click();
  await page.getByLabel('Código de 6 cifras').fill(await smsCodeFor('+34600000003'));
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  for (const path of [
    '/admin',
    '/admin/alertas',
    '/admin/verificaciones',
    '/admin/ubicaciones',
    '/admin/denuncias',
    '/admin/retenciones',
    '/admin/recursos',
    '/admin/quejas',
    '/admin/usuarios',
    '/admin/ciudades',
    '/admin/ayuda',
    '/admin/parametros',
    '/admin/textos',
    '/admin/metricas',
    '/admin/rgpd',
    '/admin/patrocinados',
    '/admin/suscriptores',
    '/admin/consentimientos',
    '/admin/auditoria',
  ]) {
    await audit(page, path, h1(page));
  }
});
