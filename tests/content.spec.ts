import { expect, test } from '@playwright/test';
import { apiAs, anonClient, slug, unique } from './support/api';
import { orgs, storageStatePath } from './support/users';

test.describe('Content management & permissions', () => {
  test.describe('as Organization Admin', () => {
    test.use({ storageState: storageStatePath('northstarAdmin') });

    test('4. admin creates and publishes a page', async ({ page }) => {
      const title = unique('Admin Page');
      await page.goto('/app/northstar-sd/pages');
      await page.getByTestId('new-page').click();

      await page.getByTestId('page-title').fill(title);
      await expect(page.getByTestId('page-slug')).toHaveValue(slug(title));
      await page.getByTestId('page-summary').fill('Created by the Playwright suite.');
      await page.getByTestId('page-body').fill('## Hello\nThis page was created end-to-end.');

      await page.getByTestId('save-draft').click();
      await expect(page.getByTestId('toast-success')).toContainText('Draft saved');
      await expect(page).toHaveURL(/\/pages\/[0-9a-f-]{36}$/);

      await page.getByTestId('publish-page').click();
      await expect(page.getByTestId('toast-success').last()).toContainText('Page published');

      await page.goto('/app/northstar-sd/pages');
      const row = page.getByTestId('page-row').filter({ hasText: title });
      await expect(row).toContainText('Published');

      // Audit trail written by the database trigger.
      await page.goto('/app/northstar-sd/audit');
      await expect(page.getByTestId('audit-table')).toContainText(title);
      await expect(page.getByTestId('audit-table')).toContainText('page.published');
    });
  });

  test.describe('as Editor', () => {
    test.use({ storageState: storageStatePath('northstarEditor') });

    test('5. editor edits an existing page but cannot delete it', async ({ page }) => {
      const admin = await apiAs('northstarAdmin');
      const title = unique('Editable Page');
      const { data: created, error } = await admin
        .from('pages')
        .insert({ organization_id: orgs.northstar.id, title, slug: slug(title), body: 'Original body', status: 'published', author_id: (await admin.auth.getUser()).data.user!.id })
        .select()
        .single();
      expect(error).toBeNull();

      await page.goto(`/app/northstar-sd/pages/${created!.id}`);
      await expect(page.getByTestId('current-role')).toHaveText('Editor');
      await page.getByTestId('page-body').fill('Body updated by the editor.');
      await page.getByTestId('publish-page').click();
      await expect(page.getByTestId('toast-success')).toContainText('Page published');

      // Editors can edit but deleting is reserved for Organization Admins.
      await expect(page.getByTestId('delete-page')).toHaveCount(0);

      const { data: after } = await admin.from('pages').select('body').eq('id', created!.id).single();
      expect(after!.body).toBe('Body updated by the editor.');

      // And the database agrees: a direct API delete by the editor removes nothing.
      const editor = await apiAs('northstarEditor');
      const { count } = await editor.from('pages').delete({ count: 'exact' }).eq('id', created!.id);
      expect(count).toBe(0);
    });
  });

  test.describe('as Viewer', () => {
    test.use({ storageState: storageStatePath('northstarViewer') });

    test('6. viewer cannot edit content — in the UI or through the API', async ({ page }) => {
      await page.goto('/app/northstar-sd/pages');
      await expect(page.getByTestId('current-role')).toHaveText('Viewer');
      await expect(page.getByTestId('new-page')).toHaveCount(0);
      await expect(page.getByTestId('read-only-notice')).toBeVisible();

      await page.getByTestId('page-row').filter({ hasText: 'About the District' }).getByRole('link', { name: 'View', exact: true }).click();
      await expect(page.getByTestId('page-title')).toBeDisabled();
      await expect(page.getByTestId('publish-page')).toHaveCount(0);
      await expect(page.getByTestId('save-draft')).toHaveCount(0);

      // Hiding buttons is not security. Go around the UI and hit the API directly.
      const viewer = await apiAs('northstarViewer');
      const viewerId = (await viewer.auth.getUser()).data.user!.id;

      const insert = await viewer
        .from('pages')
        .insert({ organization_id: orgs.northstar.id, title: 'Viewer hack', slug: 'viewer-hack', author_id: viewerId });
      expect(insert.error?.message).toMatch(/row-level security/i);

      const update = await viewer.from('pages').update({ title: 'Defaced by viewer' }).eq('slug', 'about').eq('organization_id', orgs.northstar.id).select();
      expect(update.data).toEqual([]);

      const announcement = await viewer
        .from('announcements')
        .insert({ organization_id: orgs.northstar.id, title: 'Fake emergency', message: 'x', priority: 'emergency', status: 'published', author_id: viewerId });
      expect(announcement.error?.message).toMatch(/row-level security/i);

      const { data: about } = await anonClient().from('pages').select('title').eq('slug', 'about').eq('organization_id', orgs.northstar.id).single();
      expect(about!.title).toBe('About the District');
    });
  });

  test('7. a published page appears on the public site; a draft does not', async ({ browser }) => {
    const admin = await apiAs('northstarAdmin');
    const authorId = (await admin.auth.getUser()).data.user!.id;
    const publishedTitle = unique('Public Page');
    const draftTitle = unique('Secret Draft');

    const published = await admin.from('pages').insert({ organization_id: orgs.northstar.id, title: publishedTitle, slug: slug(publishedTitle), summary: 'Visible to everyone', body: 'Published body text.', status: 'published', author_id: authorId });
    const draft = await admin.from('pages').insert({ organization_id: orgs.northstar.id, title: draftTitle, slug: slug(draftTitle), body: 'Draft body text.', status: 'draft', author_id: authorId });
    expect(published.error).toBeNull();
    expect(draft.error).toBeNull();

    // Fresh, anonymous browser context — no session at all.
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto('/o/northstar-sd');
    await expect(page.getByTestId('public-org-name')).toHaveText('Northstar School District');
    await expect(page.getByTestId('public-pages')).toContainText(publishedTitle);
    await expect(page.getByTestId('public-pages')).not.toContainText(draftTitle);

    await page.getByRole('link', { name: publishedTitle }).first().click();
    await expect(page.getByTestId('public-page-title')).toHaveText(publishedTitle);
    await expect(page.getByTestId('public-page-body')).toContainText('Published body text.');

    // Even the preview URL can't reveal a draft to an anonymous visitor: RLS returns nothing.
    await page.goto(`/o/northstar-sd/pages/${slug(draftTitle)}?preview=1`);
    await expect(page.getByText('Page not found')).toBeVisible();
    const { data: leaked } = await anonClient().from('pages').select('id').eq('slug', slug(draftTitle));
    expect(leaked).toEqual([]);

    await context.close();
  });
});
