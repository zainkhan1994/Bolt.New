import { Radio } from 'lucide-react';
import { cn } from '@/components/ui';

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', dark ? 'text-white' : 'text-slate-900', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm">
        <Radio className="h-4 w-4 text-white" />
      </span>
      CommunityHub
    </span>
  );
}
