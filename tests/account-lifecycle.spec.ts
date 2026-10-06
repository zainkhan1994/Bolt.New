import { expect, test } from '@playwright/test';

/**
 * Sign-up → email verification → password reset, using the real emails captured by the
 * local Supabase mail server (Mailpit). Skipped when testing a deployed environment.
 */
const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:55424';

interface MailSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

async function emailLink(to: string, subject: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const { messages } = (await (await fetch(`${MAILPIT}/api/v1/messages`)).json()) as { messages: MailSummary[] };
    const match = messages.find((m) => m.To[0]?.Address === to && m.Subject.includes(subject));
    if (match) {
      const { Text } = (await (await fetch(`${MAILPIT}/api/v1/message/${match.ID}`)).json()) as { Text: string };
      const link = Text.match(/https?:\/\/[^\s)]+/)?.[0];
      if (link) return link;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No "${subject}" email for ${to}`);
}

test.skip(!!process.env.E2E_BASE_URL, 'Requires the local mail server');

test('new user signs up, verifies email, and resets their password', async ({ page }) => {
  const email = `new.user.${Date.now()}@example.test`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Casey Newcomer');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill('FirstPass!2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();

  // Unverified accounts can't sign in.
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill('FirstPass!2026');
  await page.getByTestId('sign-in-button').click();
  await expect(page.getByTestId('login-error')).toContainText('verify your email');

  // Verification link signs them in. They have no organization until an admin adds them.
  await page.goto(await emailLink(email, 'Confirm'));
  await expect(page.getByText("You're not part of an organization yet")).toBeVisible();
  await page.getByTestId('sign-out').click();
  await page.waitForURL('**/login');

  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Check your inbox')).toBeVisible();

  await page.goto(await emailLink(email, 'Reset'));
  await expect(page).toHaveURL(/\/reset-password/);
  await page.getByLabel('New password', { exact: true }).fill('SecondPass!2026');
  await page.getByLabel('Confirm new password').fill('SecondPass!2026');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText('Your password was updated')).toBeVisible();

  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill('SecondPass!2026');
  await page.getByTestId('sign-in-button').click();
  await expect(page.getByText("You're not part of an organization yet")).toBeVisible();
});
