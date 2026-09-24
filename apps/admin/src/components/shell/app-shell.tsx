/**
 * Structure de l'admin : bandeau d'impersonation, lien d'évitement, barre latérale, en-tête, contenu.
 * À chaque changement de page, le focus va au titre (h1) de la nouvelle page (voir lib/focus.ts) :
 * les lecteurs d'écran annoncent la page.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, type ReactNode } from 'react';
import { api, auth } from '@/lib/api';
import { requestHeadingFocus } from '@/lib/focus';
import type { SessionUser } from '@/lib/session';
import { Header } from './header';
import { ImpersonationBanner } from './impersonation-banner';
import { SessionExpiredDialog } from './session-expired-dialog';
import { Sidebar, type NavCounters } from './sidebar';

export const MAIN_ID = 'contenu';

function useUnreadMessages(): number | undefined {
  const { data } = useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => api<{ meta: { pagination: { total: number } } }>('/api/contact-submissions?filters[opened_at][$null]=true&pagination[pageSize]=1&fields[0]=id'),
    select: (response) => response.meta.pagination.total,
    refetchInterval: 60_000,
  });
  return data;
}

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const counters: NavCounters = { unreadMessages: useUnreadMessages() };
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const first = useRef(true);
  const client = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    requestHeadingFocus();
  }, [pathname]);

  const impersonating = user.municipality_role === 'super_admin' && auth.impersonatedSite() !== null;
  // Quitter : retour à la fiche de la commune consultée, dans l'espace de l'équipe
  const quitImpersonation = async () => {
    const documentId = auth.impersonatedSite();
    auth.setImpersonatedSite(null);
    client.clear();
    await navigate(documentId ? { to: '/plateforme/communes/$documentId', params: { documentId } } : { to: '/plateforme' });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {impersonating && <ImpersonationBanner siteName={user.site?.name ?? 'cette commune'} onQuit={quitImpersonation} />}
      <a
        href={`#${MAIN_ID}`}
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-text shadow-menu focus:translate-y-0"
      >
        Aller au contenu
      </a>
      <div className="flex flex-1">
        <Sidebar user={user} counters={counters} className="hidden wide:flex" />
        <Sidebar user={user} counters={counters} collapsed className="hidden md:flex wide:hidden" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header user={user} counters={counters} />
          <main id={MAIN_ID} tabIndex={-1} className="flex-1 px-4 py-6 outline-none md:px-8 md:py-7">
            {children}
          </main>
        </div>
      </div>
      <SessionExpiredDialog email={user.email} />
    </div>
  );
}
