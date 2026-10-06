import { Link } from 'react-router-dom';
import { ArrowRight, FileText, FolderOpen, History, Megaphone, ShieldCheck, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { unwrap, useQuery } from '@/lib/useQuery';
import { useAuth } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { Spinner } from '@/components/ui';

const features = [
  { icon: FileText, title: 'Website pages', text: 'Draft, preview and publish pages for your public site.' },
  { icon: Megaphone, title: 'Announcements', text: 'Normal, important and emergency notices with scheduling and expiry.' },
  { icon: FolderOpen, title: 'Document center', text: 'Searchable PDFs: policies, agendas, forms and reports.' },
  { icon: Users, title: 'Roles & teams', text: 'Organization Admins, Editors and Viewers in each organization.' },
  { icon: ShieldCheck, title: 'Tenant isolation', text: 'Row Level Security keeps each organization’s private data separate.' },
  { icon: History, title: 'Audit log', text: 'Every administrative action is recorded by the database.' },
];

export function LandingPage() {
  const { session } = useAuth();
  const { data: orgs, loading } = useQuery(
    () => supabase.from('organizations').select('id, name, slug, tagline, primary_color, type').order('name').then(unwrap),
    [],
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <Link to={session ? '/app' : '/login'} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          {session ? 'Open dashboard' : 'Sign in'}
        </Link>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(59,101,246,0.12),transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">For schools, cities and community organizations</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Your website and community communication, in one secure dashboard.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Publish pages, post emergency announcements and share documents — with roles and permissions enforced at the database.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
              Staff sign in <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#directory" className="rounded-lg px-5 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">Browse community sites</a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 p-6">
              <f.icon className="h-6 w-6 text-brand-600" />
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="directory" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Community sites</h2>
          <p className="mt-2 text-slate-600">Public portals published with CommunityHub.</p>
          {loading && !orgs ? (
            <Spinner />
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {orgs?.map((o) => (
                <Link key={o.id} to={`/o/${o.slug}`} className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: o.primary_color }}>{o.name[0]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{o.name}</span>
                    <span className="block truncate text-sm text-slate-500">{o.tagline}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
