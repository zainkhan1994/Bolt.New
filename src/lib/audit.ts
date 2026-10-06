const verbs: Record<string, string> = {
  'user.login': 'signed in',
  'page.created': 'created page',
  'page.edited': 'edited page',
  'page.published': 'published page',
  'page.unpublished': 'unpublished page',
  'page.deleted': 'deleted page',
  'announcement.created': 'created announcement',
  'announcement.edited': 'edited announcement',
  'announcement.published': 'published announcement',
  'announcement.unpublished': 'unpublished announcement',
  'announcement.deleted': 'deleted announcement',
  'document.uploaded': 'uploaded document',
  'document.edited': 'edited document',
  'document.deleted': 'deleted document',
  'member.added': 'added member',
  'member.role_changed': 'changed the role of',
  'member.removed': 'removed member',
  'organization.created': 'created organization',
  'organization.settings_updated': 'updated settings for',
};

export function describeAudit(action: string): string {
  return verbs[action] ?? action;
}
