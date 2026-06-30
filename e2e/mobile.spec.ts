import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import * as path from 'path';

// Smoke mobile (viewport Pixel 5, vedi project "mobile" in playwright.config).
// Verifica: niente scroll orizzontale di pagina, hamburger apre l'overlay + backdrop chiude,
// menu Impostazioni apribile al tap (logout raggiungibile). Bypass login = vedi situazione-iniziale.spec.

const USER_ID = '742bb26e-49f6-44ec-84a4-4fa92517bdd8';
const EMAIL = 'simone.leone300900@gmail.com';
const PRIVATE_KEY = path.resolve(__dirname, '../../agos-backend/src/main/resources/privateKey.pem');

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}
function mintAdminJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: 'https://agostinelli.gestionale',
    sub: USER_ID, upn: EMAIL, email: EMAIL, role: 'ADMIN', groups: ['ADMIN'],
    iat: now, exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = createSign('RSA-SHA256').update(signingInput).sign(readFileSync(PRIVATE_KEY));
  return `${signingInput}.${b64url(sig)}`;
}
async function loginAs(page: Page): Promise<void> {
  const token = mintAdminJwt();
  const user = JSON.stringify({ id: USER_ID, email: EMAIL, nome: 'Simone', ruolo: 'ADMIN', personaleId: null });
  const exp = String(Date.now() + 3600_000);
  await page.addInitScript(([t, u, e]) => {
    sessionStorage.setItem('auth_access_token', t);
    sessionStorage.setItem('auth_refresh_token', t);
    sessionStorage.setItem('auth_user', u);
    sessionStorage.setItem('auth_expires_at', e);
  }, [token, user, exp] as [string, string, string]);
}

const ROUTES = ['/dashboard', '/eventi', '/movimenti', '/scadenzario', '/anagrafica', '/import', '/reporting'];

test.describe('Mobile smoke', () => {
  test.beforeEach(({ page }) => loginAs(page));

  for (const route of ROUTES) {
    test(`niente scroll orizzontale su ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('.hamburger-btn')).toBeVisible();
      // lascia assestare il layout (immagini/font)
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `scrollWidth oltre la viewport su ${route}`).toBeLessThanOrEqual(1);
    });
  }

  test('hamburger apre l\'overlay e il backdrop lo chiude', async ({ page }) => {
    await page.goto('/dashboard');
    const firstLink = page.locator('.nav-link').first();
    await expect(firstLink).toBeHidden(); // overlay chiuso di default su mobile

    await page.locator('.hamburger-btn').click();
    await expect(firstLink).toBeVisible();

    await page.locator('.mat-drawer-backdrop').click();
    await expect(firstLink).toBeHidden();
  });

  test('menu Impostazioni apribile al tap (logout visibile)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('.hamburger-btn').click();
    await page.locator('.settings__trigger').click();
    await expect(page.getByRole('menuitem', { name: 'Esci' })).toBeVisible();
  });
});
