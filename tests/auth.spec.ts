import { expect, test } from '@playwright/test';
import { expectDashboard, signInViaUi } from './support/ui';

test.describe('Authentication', () => {
  test('1. user can sign in and lands on their organization dashboard', async ({ page }) => {
    await signInViaUi(page, 'northstarAdmin');
    await expectDashboard(page, 'northstarAdmin');
    await expect(page.getByTestId('current-org-name')).toHaveText('Northstar School District');
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByTestId('stat-published')).not.toHaveText('');
  });

  test('2. invalid credentials are rejected with an error', async ({ page }) => {
    await signInViaUi(page, 'northstarAdmin', 'definitely-wrong-password');
    await expect(page.getByTestId('login-error')).toHaveText(/invalid login credentials/i);
    await expect(page).toHaveURL(/\/login/);

    // Session was not created: the dashboard is still off-limits.
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login/);
  });

  test('3. protected routes redirect to sign-in and return afterwards', async ({ page }) => {
    await page.goto('/app/northstar-sd/pages');
    await expect(page).toHaveURL(/\/login\?redirect=%2Fapp%2Fnorthstar-sd%2Fpages/);

    await page.getByTestId('email-input').fill('admin@northstar.test');
    await page.getByTestId('password-input').fill(process.env.E2E_PASSWORD ?? 'CommunityHub!2026');
    await page.getByTestId('sign-in-button').click();

    await expect(page).toHaveURL(/\/app\/northstar-sd\/pages$/);
    await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible();
  });

  test('10. sign out ends the session and protects the dashboard again', async ({ page }) => {
      // Fresh sign-in (not the shared storage state) so signing out doesn't affect other specs.
      await signInViaUi(page, 'northstarViewer');
      await expectDashboard(page, 'northstarViewer');

      await page.getByTestId('sign-out').click();
      await expect(page).toHaveURL(/\/login/);

      await page.goto('/app/northstar-sd');
      await expect(page).toHaveURL(/\/login/);
      const stored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('auth-token')));
      expect(stored).toEqual([]);
  });
});
