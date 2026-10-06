import { useEffect, useState, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Eye,
  LogOut,
  Loader2,
  X,
  AlertCircle,
  Send,
  FileEdit,
  Globe,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Announcement, AnnouncementStatus } from '@/types';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formStatus, setFormStatus] = useState<AnnouncementStatus>('draft');
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Unable to load announcements.');
      setAnnouncements([]);
    } else {
      setAnnouncements(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const openCreate = () => {
    setEditing(null);
    setFormTitle('');
    setFormBody('');
    setFormStatus('draft');
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setFormTitle(a.title);
    setFormBody(a.body);
    setFormStatus(a.status);
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    const payload = { title: formTitle, body: formBody, status: formStatus };

    if (editing) {
      const { error } = await supabase
        .from('announcements')
        .update(payload)
        .eq('id', editing.id);

      if (error) {
        setFormError(error.message);
        setFormSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase.from('announcements').insert(payload);

      if (error) {
        setFormError(error.message);
        setFormSubmitting(false);
        return;
      }
    }

    setFormSubmitting(false);
    setShowForm(false);
    setEditing(null);
    loadAnnouncements();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteSubmitting(true);

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      setDeleteError(error.message);
      setDeleteSubmitting(false);
      return;
    }

    setDeleteSubmitting(false);
    setDeleteTarget(null);
    setDeleteError(null);
    loadAnnouncements();
  };

  const publishNow = async (a: Announcement) => {
    const { error } = await supabase
      .from('announcements')
      .update({ status: 'published' })
      .eq('id', a.id);

    if (error) {
      setError(`Failed to publish: ${error.message}`);
    } else {
      loadAnnouncements();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Dashboard</h1>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                isAdmin
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {isAdmin ? 'Admin' : 'Viewer'}
            </div>
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              View Site
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {isAdmin
                ? 'Create, edit, and publish announcements for your school community.'
                : 'Browse announcements. Contact an admin to make changes.'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="new-announcement-btn"
            >
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          )}
        </div>

        {/* Viewer notice */}
        {!isAdmin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Read-only access</p>
              <p className="text-sm text-blue-700 mt-0.5">
                You are signed in as a Viewer. You can read all announcements but cannot create,
                edit, publish, or delete them. This is enforced by database-level security policies.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
          </div>
        )}

        {/* List */}
        {!loading && announcements.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No announcements yet.</p>
            {isAdmin && (
              <p className="text-slate-400 text-sm mt-1">
                Click "New Announcement" to create your first one.
              </p>
            )}
          </div>
        )}

        {!loading && announcements.length > 0 && (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">{a.title}</h3>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        a.status === 'published'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {a.status === 'published' ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <FileEdit className="w-3 h-3" />
                      )}
                      {a.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">
                    {new Date(a.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-slate-700 line-clamp-2 whitespace-pre-wrap">
                    {a.body}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    {a.status === 'draft' && (
                      <button
                        onClick={() => publishNow(a)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                        data-testid={`publish-btn-${a.id}`}
                        title="Publish now"
                      >
                        <Send className="w-4 h-4" /> Publish
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(a)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
          onClick={closeForm}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editing ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Announcement title"
                  data-testid="form-title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Body</label>
                <textarea
                  required
                  rows={5}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                  placeholder="Write your announcement here..."
                  data-testid="form-body"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as AnnouncementStatus)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="form-status"
                >
                  <option value="draft">Draft (not visible publicly)</option>
                  <option value="published">Published (visible on public page)</option>
                </select>
              </div>

              {formError && (
                <div className="flex items-start gap-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="form-submit"
                >
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 text-center mb-2">
                Delete Announcement?
              </h2>
              <p className="text-sm text-slate-500 text-center mb-6">
                "{deleteTarget.title}" will be permanently deleted. This cannot be undone.
              </p>

              {deleteError && (
                <div className="flex items-start gap-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteSubmitting}
                  className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="confirm-delete"
                >
                  {deleteSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
