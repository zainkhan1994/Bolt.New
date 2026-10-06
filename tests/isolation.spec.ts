import { expect, test } from '@playwright/test';
import { apiAs } from './support/api';
import { orgs, storageStatePath } from './support/users';

/**
 * Multi-tenant isolation. A Northstar Organization Admin — the most privileged
 * non-platform role — must not be able to read or change Riverside's private data,
 * no matter how they ask.
 */
test.describe('8. Organization A cannot access Organization B administrative data', () => {
  test.describe('dashboard', () => {
    test.use({ storageState: storageStatePath('northstarAdmin') });

    test('switching the URL to another organization shows no data', async ({ page }) => {
      await page.goto(`/app/${orgs.riverside.slug}`);
      await expect(page.getByText('You are not a member of this organization')).toBeVisible();
      await expect(page.getByTestId('stat-published')).toHaveCount(0);

      await page.goto(`/app/${orgs.riverside.slug}/audit`);
      await expect(page.getByText('You are not a member of this organization')).toBeVisible();
    });
  });

  test('direct API reads of Organization B return only public data', async () => {
    const northstar = await apiAs('northstarAdmin');

    // Drafts are private: Riverside has a draft page, Northstar can't see it.
    const drafts = await northstar.from('pages').select('id, title').eq('organization_id', orgs.riverside.id).eq('status', 'draft');
    expect(drafts.error).toBeNull();
    expect(drafts.data).toEqual([]);

    // Internal (non-public) documents are private.
    const internalDocs = await northstar.from('documents').select('id').eq('organization_id', orgs.riverside.id).eq('is_public', false);
    expect(internalDocs.data).toEqual([]);

    // Rosters, audit logs and member emails are private.
    const members = await northstar.from('organization_members').select('id').eq('organization_id', orgs.riverside.id);
    expect(members.data).toEqual([]);
    const audit = await northstar.from('audit_logs').select('id').eq('organization_id', orgs.riverside.id);
    expect(audit.data).toEqual([]);
    const riversideProfiles = await northstar.from('profiles').select('email').ilike('email', '%@riverside.test');
    expect(riversideProfiles.data).toEqual([]);

    // Sanity check: the same queries DO return data for Riverside's own admin.
    const riverside = await apiAs('riversideAdmin');
    const ownDrafts = await riverside.from('pages').select('id').eq('organization_id', orgs.riverside.id).eq('status', 'draft');
    expect(ownDrafts.data!.length).toBeGreaterThan(0);
    const ownAudit = await riverside.from('audit_logs').select('id').eq('organization_id', orgs.riverside.id);
    expect(ownAudit.data!.length).toBeGreaterThan(0);
  });

  test('direct API writes into Organization B are rejected', async () => {
    const northstar = await apiAs('northstarAdmin');
    const userId = (await northstar.auth.getUser()).data.user!.id;

    const insertPage = await northstar.from('pages').insert({ organization_id: orgs.riverside.id, title: 'Cross-tenant', slug: 'cross-tenant', author_id: userId });
    expect(insertPage.error?.message).toMatch(/row-level security/i);

    const updatePage = await northstar.from('pages').update({ title: 'Hijacked' }).eq('organization_id', orgs.riverside.id).select();
    expect(updatePage.data).toEqual([]);

    const updateOrg = await northstar.from('organizations').update({ name: 'Hijacked' }).eq('id', orgs.riverside.id).select();
    expect(updateOrg.data).toEqual([]);

    // Can't add yourself to another organization...
    const joinOther = await northstar.from('organization_members').insert({ organization_id: orgs.riverside.id, user_id: userId, role: 'org_admin' });
    expect(joinOther.error?.message).toMatch(/row-level security/i);
    const rpcJoin = await northstar.rpc('add_member_by_email', { p_organization_id: orgs.riverside.id, p_email: 'admin@northstar.test', p_role: 'org_admin' });
    expect(rpcJoin.error?.message).toMatch(/only organization admins/i);

    // ...or move one of your own pages into it.
    const { data: ownPage } = await northstar.from('pages').select('id').eq('organization_id', orgs.northstar.id).limit(1).single();
    const movePage = await northstar.from('pages').update({ organization_id: orgs.riverside.id }).eq('id', ownPage!.id);
    expect(movePage.error?.message).toMatch(/row-level security/i);
  });

  test('Organization B files in Storage cannot be downloaded or overwritten', async () => {
    const northstar = await apiAs('northstarAdmin');

    const download = await northstar.storage.from('documents').download(`${orgs.riverside.id}/seed-donor-list.pdf`);
    expect(download.error).not.toBeNull();

    const upload = await northstar.storage
      .from('documents')
      .upload(`${orgs.riverside.id}/planted.pdf`, new Blob(['%PDF-1.4'], { type: 'application/pdf' }), { contentType: 'application/pdf' });
    expect(upload.error?.message).toMatch(/row-level security/i);
  });
});

test.describe('Role escalation is blocked at the database', () => {
  test('a viewer cannot promote themselves or become a super admin', async () => {
    const viewer = await apiAs('northstarViewer');
    const viewerId = (await viewer.auth.getUser()).data.user!.id;

    const promote = await viewer.from('organization_members').update({ role: 'org_admin' }).eq('user_id', viewerId).select();
    expect(promote.data ?? []).toEqual([]);

    const superAdmin = await viewer.from('profiles').update({ is_super_admin: true } as never).eq('id', viewerId);
    expect(superAdmin.error?.message).toMatch(/permission denied/i);

    const { data: membership } = await viewer.from('organization_members').select('role').eq('user_id', viewerId).single();
    expect(membership!.role).toBe('viewer');
  });

  test('an editor cannot manage members or organization settings', async () => {
    const editor = await apiAs('northstarEditor');
    const rpc = await editor.rpc('add_member_by_email', { p_organization_id: orgs.northstar.id, p_email: 'viewer@riverside.test', p_role: 'org_admin' });
    expect(rpc.error?.message).toMatch(/only organization admins/i);

    const settings = await editor.from('organizations').update({ name: 'Renamed by editor' }).eq('id', orgs.northstar.id).select();
    expect(settings.data).toEqual([]);
  });

  test('audit logs cannot be forged or erased, even by an org admin', async () => {
    const admin = await apiAs('northstarAdmin');
    const forge = await admin.from('audit_logs').insert({ organization_id: orgs.northstar.id, action: 'page.deleted', resource_type: 'page' } as never);
    expect(forge.error?.message).toMatch(/permission denied/i);
    const erase = await admin.from('audit_logs').delete().eq('organization_id', orgs.northstar.id);
    expect(erase.error?.message).toMatch(/permission denied/i);
  });
});
