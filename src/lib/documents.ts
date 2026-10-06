import { DOCUMENTS_BUCKET, supabase } from '@/lib/supabase';
import type { DocumentRecord } from '@/types';

export const DOCUMENT_CATEGORIES = ['General', 'Policies', 'Forms', 'Calendars', 'Board Meetings', 'Reports', 'Finance', 'Development'];

/** Opens a document through a short-lived signed URL. Storage RLS decides whether one is issued. */
export async function openDocument(doc: Pick<DocumentRecord, 'file_path'>) {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.file_path, 60);
  if (error) throw error;
  window.open(data.signedUrl, '_blank', 'noopener');
}
