import { useMemo, useState } from 'react';
import { Download, FileText, FolderOpen, Globe, Lock, Search, Trash2, Upload } from 'lucide-react';
import { DOCUMENTS_BUCKET, supabase } from '@/lib/supabase';
import { useOrg } from '@/lib/org';
import { useAuth } from '@/lib/auth';
import { unwrap, useQuery } from '@/lib/useQuery';
import { errorMessage, formatBytes, formatDate } from '@/lib/format';
import { DOCUMENT_CATEGORIES, openDocument } from '@/lib/documents';
import { useToast } from '@/components/ui/toast';
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea, Toggle } from '@/components/ui';
import type { DocumentRecord } from '@/types';

const MAX_BYTES = 20 * 1024 * 1024;

export function DocumentsPage() {
  const { organization, can } = useOrg();
  const { session } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<DocumentRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [docCategory, setDocCategory] = useState('General');
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, error, loading, reload } = useQuery(
    () =>
      supabase
        .from('documents')
        .select('*, uploader:profiles(full_name, email)')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .then(unwrap),
    [organization.id],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (d) =>
        (category === 'all' || d.category === category) &&
        (!q || d.title.toLowerCase().includes(q) || (d.description ?? '').toLowerCase().includes(q)),
    );
  }, [data, query, category]);

  const categories = useMemo(() => Array.from(new Set([...(data ?? []).map((d) => d.category)])).sort(), [data]);

  const resetUpload = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setDocCategory('General');
    setIsPublic(true);
    setUploadError(null);
  };

  const upload = async () => {
    setUploadError(null);
    if (!file) return setUploadError('Choose a PDF to upload.');
    if (file.type !== 'application/pdf') return setUploadError('Only PDF files are supported.');
    if (file.size > MAX_BYTES) return setUploadError('Files must be 20 MB or smaller.');
    if (!title.trim()) return setUploadError('Title is required.');

    setUploading(true);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    const path = `${organization.id}/${crypto.randomUUID()}-${safeName}`;

    const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, { contentType: 'application/pdf' });
    if (storageError) {
      setUploading(false);
      return setUploadError(errorMessage(storageError));
    }

    const { error: insertError } = await supabase.from('documents').insert({
      organization_id: organization.id,
      title: title.trim(),
      description: description.trim() || null,
      category: docCategory,
      file_path: path,
      file_size: file.size,
      is_public: isPublic,
      uploaded_by: session?.user.id,
    });

    if (insertError) {
      // Don't leave an orphaned file behind.
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
      setUploading(false);
      return setUploadError(errorMessage(insertError));
    }

    setUploading(false);
    setUploadOpen(false);
    resetUpload();
    toast.success('Document uploaded.');
    await reload();
  };

  const remove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error: rowError } = await supabase.from('documents').delete().eq('id', deleting.id);
    if (!rowError) await supabase.storage.from(DOCUMENTS_BUCKET).remove([deleting.file_path]);
    setDeleteBusy(false);
    setDeleting(null);
    if (rowError) return toast.error(errorMessage(rowError));
    toast.success('Document deleted.');
    await reload();
  };

  const download = async (doc: DocumentRecord) => {
    try {
      await openDocument(doc);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Document Center"
        description="Policies, forms, agendas and reports. Public documents appear on your website."
        actions={
          can('documents.upload') ? (
            <Button icon={Upload} onClick={() => setUploadOpen(true)} data-testid="upload-document">Upload PDF</Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500"><Lock className="h-4 w-4" />Read-only access</span>
          )
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search documents…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" aria-label="Search documents" data-testid="document-search" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-52" aria-label="Filter by category">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        {error && <div className="p-4"><Alert tone="error">{error}</Alert></div>}
        {loading && !data ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState icon={FolderOpen} title={data?.length ? 'No documents match your search' : 'No documents yet'} />
        ) : (
          <ul className="divide-y divide-slate-100" data-testid="documents-list">
            {filtered.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                  <FileText className="h-5 w-5 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{doc.title}</p>
                    <Badge>{doc.category}</Badge>
                    {doc.is_public ? (
                      <Badge tone="green"><Globe className="h-3 w-3" />Public</Badge>
                    ) : (
                      <Badge tone="amber"><Lock className="h-3 w-3" />Internal</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">{doc.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatBytes(doc.file_size)} · Uploaded {formatDate(doc.created_at)} by {doc.uploader?.full_name ?? doc.uploader?.email ?? 'unknown'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" icon={Download} onClick={() => download(doc)} aria-label={`Download ${doc.title}`} />
                  {can('documents.delete') && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleting(doc)} aria-label={`Delete ${doc.title}`} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); resetUpload(); }}
        title="Upload a document"
        description="PDF only, up to 20 MB."
        footer={
          <>
            <Button variant="secondary" onClick={() => { setUploadOpen(false); resetUpload(); }}>Cancel</Button>
            <Button loading={uploading} onClick={upload} data-testid="submit-upload">Upload</Button>
          </>
        }
      >
        <div className="space-y-5">
          {uploadError && <Alert tone="error">{uploadError}</Alert>}
          <Field label="PDF file">
            {(id) => (
              <input
                id={id}
                type="file"
                accept="application/pdf"
                data-testid="document-file"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !title) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
                }}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
              />
            )}
          </Field>
          <Field label="Title">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="document-title" />}</Field>
          <Field label="Description">{(id) => <Textarea id={id} rows={2} className="min-h-0" value={description} onChange={(e) => setDescription(e.target.value)} />}</Field>
          <Field label="Category">
            {(id) => (
              <Select id={id} value={docCategory} onChange={(e) => setDocCategory(e.target.value)} data-testid="document-category">
                {DOCUMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            )}
          </Field>
          <Toggle label="Show on public website" description="Internal documents are only visible to your team." checked={isPublic} onChange={setIsPublic} />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete document?"
        message={<>“{deleting?.title}” and its file will be permanently deleted.</>}
        loading={deleteBusy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
