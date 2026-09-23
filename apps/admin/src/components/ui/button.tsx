import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Boutons du handoff : 36 px (44 en mobile), 14/600, rayon 8. Une seule action principale par écran. */
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand-button text-on-brand hover:bg-brand-hover disabled:bg-muted disabled:text-secondary',
        secondary: 'border border-border-input bg-surface text-text hover:bg-surface-hover disabled:text-secondary',
        tertiary: 'text-brand hover:bg-surface-hover disabled:text-secondary',
        destructive: 'bg-destructive text-on-destructive hover:opacity-90',
        'destructive-outline': 'border border-danger bg-surface text-danger hover:bg-danger-alert-bg',
        icon: 'border border-border-input bg-surface text-text hover:bg-surface-hover',
        ghost: 'text-text hover:bg-surface-hover',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-[13px]',
        lg: 'h-11 px-4 text-[15px]',
        icon: 'size-9',
        'icon-lg': 'size-11',
      },
    },
    compoundVariants: [{ variant: 'tertiary', size: 'default', className: 'px-3' }],
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : 'button';
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
