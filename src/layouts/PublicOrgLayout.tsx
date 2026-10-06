import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AlertTriangle, Mail, MapPin, Menu, Phone, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { unwrap, useQuery } from '@/lib/useQuery';
import { cn, EmptyState, Spinner } from '@/components/ui';
import { Logo } from '@/components/Logo';
import type { Announcement, Organization } from '@/types';

export interface PublicOrgContext {
  organization: Organization;
}

export function usePublicOrg(): PublicOrgContext {
  return useOutletContext<PublicOrgContext>();
}

/**
 * Public site shell. Runs with whatever session the visitor has, but only ever asks for
 * published content; RLS independently guarantees anonymous visitors can't see more.
 */
export function PublicOrgLayout() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const { data, loading } = useQuery(async () => {
    const organization = await supabase.from('organizations').select('*').eq('slug', orgSlug!).maybeSingle().then((r) => {
      if (r.error) throw r.error;
      return r.data;
    });
    if (!organization) return null;
    const now = new Date().toISOString();
    const [nav, emergencies] = await Promise.all([
      supabase.from('pages').select('title, slug').eq('organization_id', organization.id).eq('status', 'published').eq('show_in_nav', true).order('nav_order').then(unwrap),
      supabase
        .from('announcements')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'published')
        .eq('priority', 'emergency')
        .lte('publish_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .then(unwrap),
    ]);
    return { organization, nav, emergencies: emergencies as Announcement[] };
  }, [orgSlug]);

  if (loading && !data) return <Spinner />;
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <EmptyState icon={AlertTriangle} title="Site not found" description="This organization doesn't exist or its public site is turned off." action={<Link to="/" className="text-sm font-medium text-brand-700">Go to CommunityHub</Link>} />
      </div>
    );
  }

  const { organization, nav, emergencies } = data;
  const base = `/o/${organization.slug}`;
  const color = organization.primary_color;

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`${base}/search?q=${encodeURIComponent(q.trim())}`);
  };

  const navLinks = [
    { to: base, label: 'Home', end: true },
    ...nav.map((p) => ({ to: `${base}/pages/${p.slug}`, label: p.title, end: false })),
    { to: `${base}/announcements`, label: 'Announcements', end: false },
    { to: `${base}/documents`, label: 'Documents', end: false },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ ['--org-color' as string]: color }}>
      {emergencies.map((a) => (
        <div key={a.id} className="bg-red-600 text-white" role="alert" data-testid="emergency-banner">
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-3 text-sm sm:px-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p><span className="font-semibold">{a.title}.</span> {a.message}</p>
          </div>
        </div>
      ))}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to={base} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold text-white" style={{ backgroundColor: color }}>
              {organization.name[0]}
            </span>
            <span className="font-semibold tracking-tight text-slate-900" data-testid="public-org-name">{organization.name}</span>
          </Link>
          <form onSubmit={submitSearch} className="relative ml-auto hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this site" aria-label="Search this site" className="h-9 w-64 rounded-full border-0 bg-slate-100 pl-9 pr-4 text-sm focus:ring-2 focus:ring-[var(--org-color)]" />
          </form>
          <button type="button" className="ml-auto text-slate-600 md:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <nav className={cn('mx-auto max-w-6xl px-4 sm:px-6', menuOpen ? 'block' : 'hidden md:block')} aria-label="Site">
          <ul className="flex flex-col gap-1 pb-3 md:flex-row md:gap-6 md:overflow-x-auto md:pb-0">
            {navLinks.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn('block whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors', isActive ? 'border-[var(--org-color)] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900')
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet context={{ organization } satisfies PublicOrgContext} />
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-900">{organization.name}</p>
            <p className="mt-2 text-slate-500">{organization.tagline}</p>
          </div>
          <ul className="space-y-2 text-slate-600">
            {organization.address && <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-slate-400" />{organization.address}</li>}
            {organization.contact_phone && <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" />{organization.contact_phone}</li>}
            {organization.contact_email && <li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><a href={`mailto:${organization.contact_email}`} className="hover:underline">{organization.contact_email}</a></li>}
          </ul>
          <div className="md:text-right">
            <Link to="/login" className="font-medium text-slate-600 hover:text-slate-900">Staff sign in</Link>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400 md:justify-end">Powered by <Logo className="text-xs" /></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
