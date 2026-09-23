/**
 * Barre latérale : 232 px (1440 et plus), repliée en icônes 64 px en dessous (info-bulles et aria-label),
 * tiroir plein écran sur mobile (voir mobile-nav.tsx, qui réutilise NavList).
 * Liens réels du routeur : l'entrée active porte aria-current="page".
 */
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/tooltip';
import type { SessionUser } from '@/lib/session';
import { themeName } from '@/lib/session';
import { cn, initials } from '@/lib/utils';
import { CommuneoLogo } from './logo';
import { canSee, MY_SITE, MY_SITE_LINKS, NAVIGATION, NAVIGATION_END, type NavLink } from './navigation';

export interface NavCounters {
  unreadMessages?: number;
}

type Density = 'desktop' | 'collapsed' | 'mobile';

const itemClass = (density: Density) =>
  cn(
    'group flex items-center rounded-lg text-text outline-offset-2 hover:bg-surface-hover aria-[current=page]:bg-brand-soft aria-[current=page]:font-semibold aria-[current=page]:text-brand',
    density === 'desktop' && 'h-9 gap-2.5 px-2.5 text-sm',
    density === 'mobile' && 'h-12 gap-3 px-3 text-[15px]',
    density === 'collapsed' && 'size-10 justify-center',
  );

function Counter({ value, density }: { value?: number; density: Density }) {
  if (!value) return null;
  const label = `${value} non lu${value > 1 ? 's' : ''}`;
  return density === 'collapsed' ? (
    <span className="absolute top-1 right-1 size-2 rounded-full bg-brand" aria-hidden="true" />
  ) : (
    <span className="ml-auto rounded-full bg-brand-button px-1.5 py-px text-[11px] font-semibold text-on-brand">
      <span aria-hidden="true">{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

function Item({ link, density, counters, onNavigate }: { link: NavLink; density: Density; counters: NavCounters; onNavigate?: () => void }) {
  const Icon = link.icon;
  const count = link.counter ? counters[link.counter] : undefined;
  const accessibleName = count && density === 'collapsed' ? `${link.label} (${count} non lu${count > 1 ? 's' : ''})` : undefined;
  const plain = link.indented && density !== 'collapsed';
  const anchor = (
    <Link
      to={link.to}
      activeOptions={{ exact: link.to === '/' }}
      className={cn(itemClass(density), density === 'collapsed' && 'relative', plain && (density === 'mobile' ? 'pl-11' : 'pl-[38px]'))}
      aria-label={density === 'collapsed' ? (accessibleName ?? link.label) : undefined}
      onClick={onNavigate}
    >
      {!plain && <Icon aria-hidden="true" strokeWidth={1.75} className={density === 'mobile' ? 'size-5' : 'size-[18px]'} />}
      {density !== 'collapsed' && <span className="truncate">{link.label}</span>}
      <Counter value={count} density={density} />
    </Link>
  );
  return <li>{density === 'collapsed' ? <Tooltip label={link.label}>{anchor}</Tooltip> : anchor}</li>;
}

/** « Mon site » : sous-menu dépliable (déplié d'office sur une de ses pages) ou menu en mode icônes */
function MySite({ user, density, onNavigate }: { user: SessionUser; density: Density; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const inside = pathname.startsWith(MY_SITE.to);
  const [open, setOpen] = useState(inside);
  const listId = useId();
  const links = MY_SITE_LINKS.filter((link) => canSee(link, user.municipality_role));
  const Icon = MY_SITE.icon;

  if (density === 'collapsed') {
    return (
      <li>
        <DropdownMenu>
          <Tooltip label={MY_SITE.label}>
            <DropdownMenuTrigger
              className={cn(itemClass(density), inside && 'bg-brand-soft text-brand')}
              aria-label={MY_SITE.label}
            >
              <Icon aria-hidden="true" strokeWidth={1.75} className="size-[18px]" />
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuLabel>{MY_SITE.label}</DropdownMenuLabel>
            {links.map((link) => (
              <DropdownMenuItem key={link.to} asChild>
                <Link to={link.to} className="aria-[current=page]:font-semibold aria-[current=page]:text-brand">
                  {link.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className={cn(itemClass(density), 'w-full', inside && 'font-semibold text-brand')}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon aria-hidden="true" strokeWidth={1.75} className={density === 'mobile' ? 'size-5' : 'size-[18px]'} />
        <span>{MY_SITE.label}</span>
        <ChevronRight aria-hidden="true" className={cn('ml-auto size-4 text-secondary transition-transform', open && 'rotate-90')} />
      </button>
      <ul id={listId} hidden={!open} className="mt-0.5 space-y-0.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              onClick={onNavigate}
              className={cn(
                'flex items-center rounded-lg pr-2.5 text-text hover:bg-surface-hover aria-[current=page]:bg-brand-soft aria-[current=page]:font-semibold aria-[current=page]:text-brand',
                density === 'mobile' ? 'h-12 pl-11 text-[15px]' : 'h-8 pl-[38px] text-[13px]',
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function NavList({ user, density, counters, onNavigate }: { user: SessionUser; density: Density; counters: NavCounters; onNavigate?: () => void }) {
  const role = user.municipality_role;
  const uid = useId();
  const listClass = cn('space-y-0.5', density === 'collapsed' && 'flex flex-col items-center');
  return (
    <div className="space-y-4">
      {NAVIGATION.map((group, index) => (
        <div key={group.heading ?? index}>
          {group.heading &&
            (density === 'collapsed' ? (
              <div aria-hidden="true" className="mx-auto mb-2 h-px w-8 bg-border" />
            ) : (
              <p id={`${uid}-${index}`} className="mb-1 px-2.5 text-[11px] font-semibold tracking-[0.06em] text-secondary uppercase">
                {group.heading}
              </p>
            ))}
          <ul className={listClass} aria-labelledby={group.heading && density !== 'collapsed' ? `${uid}-${index}` : undefined} aria-label={group.heading && density === 'collapsed' ? group.heading : undefined}>
            {group.links.filter((link) => canSee(link, role)).map((link) => (
              <Item key={link.to} link={link} density={density} counters={counters} onNavigate={onNavigate} />
            ))}
          </ul>
        </div>
      ))}
      <ul className={listClass}>
        <MySite user={user} density={density} onNavigate={onNavigate} />
        {NAVIGATION_END.filter((link) => canSee(link, role)).map((link) => (
          <Item key={link.to} link={link} density={density} counters={counters} onNavigate={onNavigate} />
        ))}
      </ul>
    </div>
  );
}

export function SiteIdentity({ user, compact }: { user: SessionUser; compact?: boolean }) {
  const name = user.site?.name ?? 'Commune';
  return (
    <div className={cn('flex items-center gap-2.5', compact && 'justify-center')}>
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface text-[13px] font-semibold text-brand">
        {initials(name)}
      </span>
      {compact ? (
        <span className="sr-only">{name}</span>
      ) : (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block truncate text-[13px] text-secondary">Thème {themeName(user.site?.theme)}</span>
        </span>
      )}
    </div>
  );
}

export function Sidebar({ user, counters, collapsed, className }: { user: SessionUser; counters: NavCounters; collapsed?: boolean; className?: string }) {
  return (
    <aside className={cn('sticky top-0 h-dvh shrink-0 flex-col border-r border-border bg-sidebar', collapsed ? 'w-16' : 'w-[232px]', className)}>
      <div className={cn('border-b border-border py-3', collapsed ? 'px-2' : 'px-4')}>
        <SiteIdentity user={user} compact={collapsed} />
      </div>
      <nav aria-label="Navigation principale" className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        <NavList user={user} density={collapsed ? 'collapsed' : 'desktop'} counters={counters} />
      </nav>
      {!collapsed && (
        <div className="px-5 py-4 opacity-85">
          <CommuneoLogo className="w-24" />
        </div>
      )}
    </aside>
  );
}
