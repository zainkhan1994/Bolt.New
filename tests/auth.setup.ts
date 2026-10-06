import { test as setup } from '@playwright/test';
import { signInViaUi, expectDashboard } from './support/ui';
import { storageStatePath, type UserKey } from './support/users';

// Sign in once per role and reuse the browser session in the other specs.
const keys: UserKey[] = ['northstarAdmin', 'northstarEditor', 'northstarViewer'];

for (const key of keys) {
  setup(`authenticate ${key}`, async ({ page }) => {
    await signInViaUi(page, key);
    await expectDashboard(page, key);
    await page.context().storageState({ path: storageStatePath(key) });
  });
}
