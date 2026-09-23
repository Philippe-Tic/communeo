/**
 * Choix de la commune par l'équipe Communeo (super admin) : l'administration s'ouvre ensuite
 * sur cette commune, avec le bandeau « Mode équipe Communeo ». Écran minimal en attendant
 * les écrans super admin (#146).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ChevronRight, Search } from 'lucide-react';
import { useId, useState } from 'react';
import { AuthLayout } from '@/components/auth-layout';
import { controlClass } from '@/components/form';
import { Button } from '@/components/ui/button';
import { api, auth, isUnauthenticated } from '@/lib/api';
import { logout, sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';

interface SiteSummary {
  documentId: string;
  name: string;
  slug: string;
}

export const Route = createFileRoute('/communes')({
  beforeLoad: async ({ context, location }) => {
    try {
      const user = await context.queryClient.ensureQueryData(sessionQuery);
      if (user.municipality_role !== 'super_admin') throw redirect({ to: '/' });
    } catch (error) {
      if (isUnauthenticated(error)) throw redirect({ to: '/connexion', search: { retour: location.href } });
      throw error;
    }
  },
  component: SitePicker,
});

function SitePicker() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const searchId = useId();
  const [search, setSearch] = useState('');
  const sites = useQuery({
    queryKey: ['communes'],
    queryFn: () => api<{ data: SiteSummary[] }>('/api/site-management'),
    select: (response) => [...response.data].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  });
  const needle = search.trim().toLocaleLowerCase('fr');
  const shown = sites.data?.filter((site) => !needle || site.name.toLocaleLowerCase('fr').includes(needle) || site.slug.includes(needle));

  const open = async (site: SiteSummary) => {
    auth.setImpersonatedSite(site.documentId);
    client.clear();
    await navigate({ to: '/' });
  };

  const signOut = async () => {
    await logout().catch(() => undefined);
    auth.setImpersonatedSite(null);
    client.clear();
    await navigate({ to: '/connexion' });
  };

  return (
    <AuthLayout title="Choisir une commune" documentTitle="Communes">
      <p className="text-secondary">L'administration s'ouvre sur la commune choisie ; vos actions y sont enregistrées.</p>
      <label htmlFor={searchId} className="mt-4 block font-medium">
        Rechercher
      </label>
      <div className="relative mt-1.5">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" />
        <input id={searchId} type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={cn(controlClass, 'h-11 pl-9 md:h-10')} />
      </div>
      <div className="mt-4">
        {sites.isPending ? (
          <p role="status">Chargement des communes…</p>
        ) : sites.isError ? (
          <p role="alert" className="text-danger">
            La liste des communes n'a pas pu être chargée.
          </p>
        ) : (
          <>
            <p role="status" className="sr-only">
              {shown!.length} commune{shown!.length > 1 ? 's' : ''}
            </p>
            {shown!.length === 0 ? (
              <p className="text-secondary">Aucune commune ne correspond.</p>
            ) : (
              <ul className="max-h-[50dvh] divide-y divide-border-row overflow-y-auto rounded-lg border border-border">
                {shown!.map((site) => (
                  <li key={site.documentId}>
                    <button type="button" onClick={() => void open(site)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{site.name}</span>
                        <span className="block text-[13px] text-secondary">{site.slug}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-secondary" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <Button variant="tertiary" className="mt-4" onClick={() => void signOut()}>
        Se déconnecter
      </Button>
    </AuthLayout>
  );
}
