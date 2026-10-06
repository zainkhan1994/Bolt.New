import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  ChevronsUpDown,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { OrgProvider } from '@/lib/org';
import { can, roleLabels, type Permission } from '@/lib/permissions';
import { Badge, Card, cn, EmptyState, Spinner } from '@/components/ui';
import { Logo } from '@/components/Logo';
import type { Membership } from '@/types';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  permission?: Permission;
}

const orgNav: NavItem[] = [
  { label: 'Overview', to: '', icon: LayoutDashboard, end: true },
  { label: 'Pages', to: 'pages', icon: FileText },
  { label: 'Announcements', to: 'announcements', icon: Megaphone },
  { label: 'Documents', to: 'documents', icon: FolderOpen },
  { label: 'Users', to: 'users', icon: Users },
  { label: 'Settings', to: 'settings', icon: Settings },
  { label: 'Audit Log', to: 'audit', icon: History, permission: 'audit.view' },
];

function initials(name: string | null | undefined, email: string): string {
  const source = name?.trim() || email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

function OrgSwitcher({ current, memberships, isSuperAdmin }: { current: Membership | null; memberships: Membership[]; isSuperAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="org-switcher"
        className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left ring-1 ring-white/10 transition hover:bg-white/10"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
          style={{ backgroundColor: current?.organization.primary_color ?? '#475569' }}
        >
          {current ? current.organization.name[0] : <Building2 className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white" data-testid="current-org-name">
            {current?.organization.name ?? (isSuperAdmin ? 'Platform' : 'Choose organization')}
          </span>
          <span className="block truncate text-xs text-slate-400">
            {current ? roleLabels[current.role] : isSuperAdmin ? 'Super Admin' : `${memberships.length} organization${memberships.length === 1 ? '' : 's'}`}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-lg bg-white py-1 shadow-xl ring-1 ring-slate-200">
          <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Organizations</p>
          {memberships.map((m) => (
            <Link
              key={m.organization.id}
              to={`/app/${m.organization.slug}`}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50',
                m.organization.id === current?.organization.id ? 'font-medium text-brand-700' : 'text-slate-700',
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.organization.primary_color }} />
              <span className="flex-1 truncate">{m.organization.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Shell({ current, children }: { current: Membership | null; children: React.ReactNode }) {
  const { profile, memberships, signOut, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const email = profile?.email ?? session?.user.email ?? '';
  const isSuperAdmin = profile?.is_super_admin ?? false;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
    );

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-950 px-4 py-5">
      <div className="flex items-center justify-between px-2">
        <Link to="/app">
          <Logo dark />
        </Link>
        <button type="button" className="text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6">
        <OrgSwitcher current={current} memberships={memberships} isSuperAdmin={isSuperAdmin} />
      </div>

      <nav className="mt-6 flex-1 space-y-1" aria-label="Dashboard">
        {current &&
          orgNav
            .filter((item) => !item.permission || can(current.role, item.permission))
            .map((item) => (
              <NavLink key={item.label} to={`/app/${current.organization.slug}${item.to ? `/${item.to}` : ''}`} end={item.end} className={linkClass}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
        {isSuperAdmin && (
          <>
            <p className="px-3 pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-slate-500">Platform</p>
            <NavLink to="/platform/organizations" className={linkClass}>
              <ShieldCheck className="h-4 w-4" />
              All Organizations
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-white/10 pt-4">
        <NavLink to="/account" className={linkClass}>
          <UserCircle className="h-4 w-4" />
          Account & notifications
        </NavLink>
        <div className="mt-3 flex items-center gap-3 px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
            {initials(profile?.full_name, email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{profile?.full_name ?? email}</p>
            <p className="truncate text-xs text-slate-400" data-testid="user-email">{email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
            data-testid="sign-out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">{sidebar}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-8">
          <button type="button" className="text-slate-500 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {current && (
              <>
                <span className="hidden truncate text-sm font-medium text-slate-700 sm:inline">{current.organization.name}</span>
                <Badge className="whitespace-nowrap" tone={current.role === 'viewer' ? 'slate' : current.role === 'editor' ? 'blue' : 'violet'}>
                  <span data-testid="current-role">{roleLabels[current.role]}</span>
                </Badge>
              </>
            )}
          </div>
          {current && (
            <a
              href={`/o/${current.organization.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700"
            >
              <span className="hidden sm:inline">View public site</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

/** /app/:orgSlug/* — resolves the organization from the URL against the user's memberships. */
export function OrgLayout() {
  const { orgSlug } = useParams();
  const { memberships } = useAuth();
  const current = memberships.find((m) => m.organization.slug === orgSlug) ?? null;

  if (!current) {
    return (
      <Shell current={null}>
        <Card>
          <EmptyState
            icon={ShieldCheck}
            title="You are not a member of this organization"
            description="Administrative data is only available to members. Choose one of your organizations from the switcher."
          />
        </Card>
      </Shell>
    );
  }

  return (
    <Shell current={current}>
      <OrgProvider organization={current.organization} role={current.role}>
        <Outlet />
      </OrgProvider>
    </Shell>
  );
}

/** Screens outside any organization (account, platform admin). */
export function PlainLayout() {
  return (
    <Shell current={null}>
      <Outlet />
    </Shell>
  );
}

/** /app — send the user to their first organization. */
export function AppIndexRedirect() {
  const { memberships, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (memberships.length > 0) return <Navigate to={`/app/${memberships[0].organization.slug}`} replace />;
  if (profile?.is_super_admin) return <Navigate to="/platform/organizations" replace />;
  return (
    <Shell current={null}>
      <Card>
        <EmptyState
          icon={Building2}
          title="You're not part of an organization yet"
          description="Your account is active. An Organization Admin needs to add you to their organization before you can access the dashboard."
        />
      </Card>
    </Shell>
  );
}
