import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldCheck, Users } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/">
            <Logo />
          </Link>
          <h1 className="mt-10 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,101,246,0.35),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(15,118,110,0.3),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end p-16 text-white">
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            One dashboard for your website, announcements and documents.
          </p>
          <p className="mt-4 max-w-md text-slate-300">
            Built for school districts, municipalities and community organizations that need to reach people quickly and securely.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-slate-300">
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-brand-300" />Database-enforced permissions on every record</li>
            <li className="flex items-center gap-3"><Users className="h-5 w-5 text-brand-300" />Admin, Editor and Viewer roles per organization</li>
            <li className="flex items-center gap-3"><Lock className="h-5 w-5 text-brand-300" />Each organization's private data is fully isolated</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
