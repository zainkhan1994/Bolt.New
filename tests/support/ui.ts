import { expect, type Page } from '@playwright/test';
import { PASSWORD, users, type UserKey } from './users';

export async function signInViaUi(page: Page, key: UserKey, password = PASSWORD) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(users[key].email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('sign-in-button').click();
}

export async function expectDashboard(page: Page, key: UserKey) {
  await page.waitForURL(`**/app/${users[key].org}**`);
  await expect(page.getByTestId('current-role')).toHaveText(users[key].role);
}
