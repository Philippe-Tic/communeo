/**
 * Menu mobile : tiroir plein écran (focus piégé, fermeture par le bouton, Échap ou clic à l'extérieur),
 * avec « Voir le site », l'état de mise en ligne et les mêmes rubriques en grandes cibles (48 px).
 */
import { Dialog } from 'radix-ui';
import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/session';
import { ColorSchemeToggle } from './color-scheme-toggle';
import { PublicationStatus } from './publication-status';
import { NavList, SiteIdentity, type NavCounters } from './sidebar';

export function MobileNav({ user, counters, viewSite }: { user: SessionUser; counters: NavCounters; viewSite: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Menu">
          <Menu aria-hidden="true" strokeWidth={1.75} className="size-6" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-sidebar">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title asChild>
              <div>
                <SiteIdentity user={user} />
              </div>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Fermer le menu">
                <X aria-hidden="true" className="size-6" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Navigation de l'administration</Dialog.Description>
          <div className="space-y-3 border-b border-border p-4">
            <PublicationStatus stacked />
            <div className="grid">{viewSite}</div>
          </div>
          <nav aria-label="Navigation principale" className="flex-1 p-3">
            <NavList user={user} density="mobile" counters={counters} onNavigate={() => setOpen(false)} />
          </nav>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[15px]">
            <span>Mode sombre</span>
            <ColorSchemeToggle />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
