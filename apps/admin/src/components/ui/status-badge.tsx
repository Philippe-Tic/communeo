import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

const TONES: Record<Tone, string> = {
  success: 'bg-success-bg text-success',
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-neutral-bg text-neutral',
};

/** Badge de statut (pill 12/600) : toujours un libellé, jamais la couleur seule. */
export function StatusBadge({ tone, icon, size = 'sm', children, className }: { tone: Tone; icon?: ReactNode; size?: 'sm' | 'md'; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full',
        size === 'sm' ? 'py-[3px] pr-2.5 pl-2 text-xs font-semibold' : 'py-1 pr-3 pl-2.5 text-[13px] font-medium',
        TONES[tone],
        className,
      )}
    >
      {icon ?? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
