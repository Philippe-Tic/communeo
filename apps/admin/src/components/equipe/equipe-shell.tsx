/**
 * Espace de l'équipe Communeo (handoff 6.20) : même structure que l'administration d'une commune,
 * navigation réduite (Communes, Utilisateurs, Statistiques) et barre latérale de couleur de marque,
 * pour ne jamais confondre cet espace avec l'admin d'une commune.
 */
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { BarChart3, Building2, History, LogOut, Users } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { ColorSchemeToggle } from '@/components/shell/color-scheme-toggle';
import { SessionExpiredDialog } from '@/components/shell/session-expired-dialog';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/api';
import { requestHeadingFocus } from '@/lib/focus';
import { displayName, logout, type SessionUser } from '@/lib/session';
import { cn, initials } from '@/lib/utils';

const LINKS = [
  { to: '/plateforme', label: 'Communes', icon: Building2 },
  { to: '/plateforme/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/plateforme/statistiques', label: 'Statistiques', icon: BarChart3 },
  { to: '/plateforme/journal', label: 'Journal', icon: History },
] as const;

function isCurrent(pathname: string, to: string) {
  if (to === '/plateforme') return pathname === '/plateforme' || pathname.startsWith('/plateforme/communes');
  return pathname === to;
}

export function EquipeShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    requestHeadingFocus();
  }, [pathname]);

  const signOut = async () => {
    await logout().catch(() => undefined);
    auth.setImpersonatedSite(null);
    await navigate({ to: '/connexion' });
    client.clear();
  };

  const nav = (className: string, itemClass: string) => (
    <nav aria-label="Espace équipe Communeo" className={className}>
      <ul className="contents">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            {/* Lien actif exact : le routeur marquerait sinon « Communes » sur toutes les pages de l'espace */}
            <Link
              to={to}
              activeOptions={{ exact: true }}
              aria-current={isCurrent(pathname, to) ? 'page' : undefined}
              className={itemClass}
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#contenu"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-text shadow-menu focus:translate-y-0"
      >
        Aller au contenu
      </a>
      {/* Ordinateur et tablette : barre latérale de couleur de marque */}
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col bg-brand-button p-3 text-on-brand md:flex">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-white/15 font-semibold">
            C
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-semibold">Communeo</p>
            <p className="text-[12px] opacity-80">Équipe · super admin</p>
          </div>
        </div>
        {nav(
          'mt-4 flex flex-col gap-0.5',
          'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-on-brand/90 hover:bg-white/10 aria-[current=page]:bg-white/15 aria-[current=page]:font-semibold aria-[current=page]:text-on-brand',
        )}
        <div className="mt-auto flex items-center gap-2 border-t border-white/15 px-1 pt-3">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 text-[12px] font-semibold"
          >
            {initials(displayName(user))}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px]">{displayName(user)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="text-on-brand hover:bg-white/10"
            onClick={() => void signOut()}
          >
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-surface dark:bg-sidebar">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            <p className="flex-1 font-semibold md:hidden">Communeo · équipe</p>
            <div className="ml-auto flex items-center gap-2">
              <ColorSchemeToggle />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Se déconnecter"
                className="md:hidden"
                onClick={() => void signOut()}
              >
                <LogOut aria-hidden="true" />
              </Button>
            </div>
          </div>
          {/* Mobile : les trois entrées en onglets sous l'en-tête */}
          {nav(
            'flex gap-1 overflow-x-auto bg-brand-button px-2 py-1.5 md:hidden',
            cn(
              'flex h-10 items-center gap-2 rounded-lg px-3 text-sm whitespace-nowrap text-on-brand/90 aria-[current=page]:bg-white/15 aria-[current=page]:font-semibold aria-[current=page]:text-on-brand',
            ),
          )}
        </header>
        <main id="contenu" tabIndex={-1} className="flex-1 px-4 py-6 outline-none md:px-8 md:py-7">
          {children}
        </main>
      </div>
      <SessionExpiredDialog email={user.email} />
    </div>
  );
}
