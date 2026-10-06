import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@school.edu';
const ADMIN_PASSWORD = 'Sch00lAdm!n2025';
const VIEWER_EMAIL = 'viewer@school.edu';
const VIEWER_PASSWORD = 'Sch00lV!ew2025';

const uniqueTitle = () => `Test Announcement ${Date.now()}`;

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('submit-button').click();
  await page.waitForURL('**/dashboard');
  await expect(page.locator('header')).toBeVisible();
}

// ---------------------------------------------------------------------------
// Test 1: Admin can create and publish an announcement
// ---------------------------------------------------------------------------
test('Admin can create and publish an announcement', async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  await page.getByTestId('new-announcement-btn').click();
  await expect(page.getByTestId('form-title')).toBeVisible();

  const title = uniqueTitle();
  const body = 'This is a test announcement created by the Playwright test suite.';

  await page.getByTestId('form-title').fill(title);
  await page.getByTestId('form-body').fill(body);
  await page.getByTestId('form-status').selectOption('published');
  await page.getByTestId('form-submit').click();

  // Modal should close, announcement should appear in the dashboard list
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 10000 });

  // Go to public page — published announcement should be visible
  await page.getByRole('link', { name: 'View Site' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(body)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 2: Published announcement appears publicly (without login)
// ---------------------------------------------------------------------------
test('Published announcement appears on the public page without login', async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.getByTestId('new-announcement-btn').click();

  const title = uniqueTitle();
  const body = 'Public visibility test body.';

  await page.getByTestId('form-title').fill(title);
  await page.getByTestId('form-body').fill(body);
  await page.getByTestId('form-status').selectOption('published');
  await page.getByTestId('form-submit').click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 10000 });

  // Sign out
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL('**/login');

  // Go to the public page as an unauthenticated user
  await page.goto('/');
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(body)).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 3: Viewer cannot modify announcements
// ---------------------------------------------------------------------------
test('Viewer cannot create, edit, publish, or delete announcements', async ({ page }) => {
  await login(page, VIEWER_EMAIL, VIEWER_PASSWORD);

  // Viewer should NOT see the "New Announcement" button
  await expect(page.getByTestId('new-announcement-btn')).not.toBeVisible();

  // Viewer should see the read-only notice
  await expect(page.getByText('Read-only access')).toBeVisible();

  // No edit/delete/publish buttons should exist
  await expect(page.locator('[data-testid^="publish-btn-"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /edit/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);

  // Attempt a direct database insert using the app's own Supabase client
  // (authenticated as the viewer). RLS must reject this at the database level.
  const result = await page.evaluate(async () => {
    const supabase = (window as any).supabase;
    const { data, error } = await supabase.from('announcements').insert({
      title: 'Should Fail',
      body: 'This should be blocked by RLS',
      status: 'draft',
    });
    return { data, error: error?.message };
  });

  expect(result.error).toBeTruthy();
  expect(result.error).toContain('row-level security');
});

// ---------------------------------------------------------------------------
// Test 4: Unauthenticated users cannot access the dashboard
// ---------------------------------------------------------------------------
test('Unauthenticated users are redirected from dashboard to login', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForURL('**/login');
  await expect(page.getByText('Staff Portal')).toBeVisible();
  await expect(page.getByTestId('email-input')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 5: Draft announcements are NOT visible on the public page
// ---------------------------------------------------------------------------
test('Draft announcements are not visible on the public page', async ({ page }) => {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.getByTestId('new-announcement-btn').click();

  const draftTitle = uniqueTitle();
  await page.getByTestId('form-title').fill(draftTitle);
  await page.getByTestId('form-body').fill('This should only be visible to staff.');
  await page.getByTestId('form-status').selectOption('draft');
  await page.getByTestId('form-submit').click();

  // Should appear in the dashboard
  await expect(page.getByRole('heading', { name: draftTitle })).toBeVisible({ timeout: 10000 });

  // Go to public page — should NOT appear
  await page.getByRole('link', { name: 'View Site' }).click();
  await expect(page.getByRole('heading', { name: draftTitle })).not.toBeVisible();
});
