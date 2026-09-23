import { CircleHelp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/session';
import { AccountMenu } from './account-menu';
import { ColorSchemeToggle } from './color-scheme-toggle';
import { MobileNav } from './mobile-nav';
import { PublicationStatus } from './publication-status';
import type { NavCounters } from './sidebar';

export const HELP_URL = 'https://doc.communeo.fr';

function ViewSite({ user, block }: { user: SessionUser; block?: boolean }) {
  if (!user.site?.live_url) return null;
  return (
    <Button asChild variant="secondary" size={block ? 'lg' : 'default'}>
      <a href={user.site.live_url} target="_blank" rel="noreferrer">
        <ExternalLink aria-hidden="true" />
        Voir le site
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    </Button>
  );
}

/** En-tête 56 px : état de mise en ligne à gauche, raccourcis et compte à droite ; version mobile compacte. */
export function Header({ user, counters }: { user: SessionUser; counters: NavCounters }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:px-6 dark:bg-sidebar">
      {/* Mobile : menu, nom de la commune, compte */}
      <div className="flex flex-1 items-center gap-2 md:hidden">
        <MobileNav user={user} counters={counters} viewSite={<ViewSite user={user} block />} />
        <span className="truncate text-[15px] font-semibold">{user.site?.name}</span>
      </div>

      <PublicationStatus className="hidden md:flex" />
      <div className="ml-auto hidden items-center gap-2 md:flex">
        <ViewSite user={user} />
        <Button asChild variant="ghost" size="icon" aria-label="Aide (nouvel onglet)">
          <a href={HELP_URL} target="_blank" rel="noreferrer">
            <CircleHelp aria-hidden="true" strokeWidth={1.75} className="size-[18px]" />
          </a>
        </Button>
        <ColorSchemeToggle />
        <AccountMenu user={user} />
      </div>
      <div className="md:hidden">
        <AccountMenu user={user} compact />
      </div>
    </header>
  );
}
