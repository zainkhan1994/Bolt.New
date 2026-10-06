import { useEffect, useState, useCallback } from 'react';
import { Megaphone, ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types';
import { Link } from 'react-router-dom';

export function PublicPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Unable to load announcements. Please try again later.');
      setAnnouncements([]);
    } else {
      setAnnouncements(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Riverside Academy</h1>
              <p className="text-xs text-slate-500">School Announcements</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Staff Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Latest Announcements</h2>
          <p className="text-slate-600">Stay up to date with school news and events.</p>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
            <button
              onClick={loadAnnouncements}
              className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No announcements have been published yet.</p>
            <p className="text-slate-400 text-sm mt-1">Please check back later.</p>
          </div>
        )}

        {!loading && !error && announcements.length > 0 && (
          <div className="space-y-4">
            {announcements.map((a) => (
              <article
                key={a.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-xl font-bold text-slate-900 mb-2">{a.title}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Calendar className="w-4 h-4" />
                  {new Date(a.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{a.body}</p>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 mt-10">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-slate-400">
          Riverside Academy &middot; Community CMS
        </div>
      </footer>
    </div>
  );
}
