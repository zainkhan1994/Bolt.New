import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/useQuery';

/** Active = published, already live, and not yet expired. */
export function activeAnnouncements(organizationId: string) {
  const now = new Date().toISOString();
  return supabase
    .from('announcements')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'published')
    .lte('publish_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('publish_at', { ascending: false })
    .then(unwrap);
}

export function publicDocuments(organizationId: string) {
  return supabase
    .from('documents')
    .select('id, title, description, category, file_path, file_size, created_at')
    .eq('organization_id', organizationId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .then(unwrap);
}
