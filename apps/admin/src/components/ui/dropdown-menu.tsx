import { DropdownMenu as Menu } from 'radix-ui';
import { Check } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Menu d'actions : popover 200–240 px, rayon 10, items rayon 6 avec icône 16. */
export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({ className, align = 'end', ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-[200px] max-w-[260px] rounded-[10px] border border-border-dialog bg-surface p-1.5 text-text shadow-menu dark:border-border',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({ className, destructive, ...props }: ComponentProps<typeof Menu.Item> & { destructive?: boolean }) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[highlighted]:bg-sidebar [&_svg]:size-4 [&_svg]:shrink-0',
        destructive && 'text-danger',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-2.5 py-2 text-[13px] text-secondary', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('my-1.5 h-px bg-border-row', className)} {...props} />;
}

export const DropdownMenuRadioGroup = Menu.RadioGroup;

/** Choix exclusif (filtre) : coche devant l'option retenue */
export function DropdownMenuRadioItem({ className, children, ...props }: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md py-2 pr-2.5 pl-8 text-sm outline-none select-none data-[highlighted]:bg-sidebar data-[state=checked]:font-semibold relative',
        className,
      )}
      {...props}
    >
      <Menu.ItemIndicator className="absolute left-2.5">
        <Check aria-hidden="true" className="size-4 text-brand" />
      </Menu.ItemIndicator>
      {children}
    </Menu.RadioItem>
  );
}
