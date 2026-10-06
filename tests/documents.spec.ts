import { expect, test } from '@playwright/test';
import { apiAs, anonClient, unique } from './support/api';
import { orgs, storageStatePath } from './support/users';

const tinyPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

test.describe('9. Document upload', () => {
  test.use({ storageState: storageStatePath('northstarEditor') });

  test('editor uploads a PDF that is stored privately and shown publicly', async ({ page, browser }) => {
    const title = unique('Lunch Menu');
    await page.goto('/app/northstar-sd/documents');
    await page.getByTestId('upload-document').click();
    await page.getByTestId('document-file').setInputFiles({ name: 'lunch-menu.pdf', mimeType: 'application/pdf', buffer: tinyPdf });
    await page.getByTestId('document-title').fill(title);
    await page.getByTestId('document-category').selectOption('Calendars');
    await page.getByTestId('submit-upload').click();

    await expect(page.getByTestId('toast-success')).toContainText('Document uploaded');
    await expect(page.getByTestId('documents-list')).toContainText(title);

    // Search/filter in the dashboard.
    await page.getByTestId('document-search').fill(title);
    await expect(page.getByTestId('documents-list').locator('li')).toHaveCount(1);

    // The file landed in this organization's folder in Storage.
    const admin = await apiAs('northstarAdmin');
    const { data: row } = await admin.from('documents').select('file_path, uploaded_by').eq('title', title).single();
    expect(row!.file_path.startsWith(`${orgs.northstar.id}/`)).toBe(true);

    // Anonymous visitors see it on the public site and can download it via a signed URL.
    const visitor = await browser.newContext({ storageState: undefined });
    const publicPage = await visitor.newPage();
    await publicPage.goto('/o/northstar-sd/documents');
    await expect(publicPage.getByTestId('public-documents')).toContainText(title);
    const signed = await anonClient().storage.from('documents').createSignedUrl(row!.file_path, 60);
    expect(signed.error).toBeNull();
    await visitor.close();
  });

  test('non-PDF files and viewers are rejected by Storage itself', async () => {
    const editor = await apiAs('northstarEditor');
    const html = await editor.storage
      .from('documents')
      .upload(`${orgs.northstar.id}/evil.html`, new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), { contentType: 'text/html' });
    expect(html.error).not.toBeNull();

    const viewer = await apiAs('northstarViewer');
    const viewerUpload = await viewer.storage
      .from('documents')
      .upload(`${orgs.northstar.id}/viewer.pdf`, new Blob([tinyPdf], { type: 'application/pdf' }), { contentType: 'application/pdf' });
    expect(viewerUpload.error?.message).toMatch(/row-level security/i);

    // Internal documents can't be fetched anonymously.
    const internal = await anonClient().storage.from('documents').download(`${orgs.northstar.id}/seed-budget-internal.pdf`);
    expect(internal.error).not.toBeNull();
  });
});
