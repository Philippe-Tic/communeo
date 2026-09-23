import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { MenuEditor } from '@/components/menu/menu-editor';
import { Button } from '@/components/ui/button';
import { publicationStatesQuery } from '@/lib/content-list';
import { sessionQuery } from '@/lib/session';
import { allPagesQuery, siteSettingsQuery } from '@/lib/site-settings';

export const Route = createFileRoute('/_app/mon-site/menu')({ component: MenuRoute });

function MenuRoute() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const site = useQuery(siteSettingsQuery(user.site!.documentId));
  const pages = useQuery(allPagesQuery);
  const states = useQuery(publicationStatesQuery('pages'));

  if (site.isError || pages.isError) {
    return (
      <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-6">
        <h1 className="text-xl">Menu du site</h1>
        <p className="mt-2">Le menu n'a pas pu être chargé.</p>
        <Button variant="secondary" className="mt-3" onClick={() => void Promise.all([site.refetch(), pages.refetch()])}>
          Réessayer
        </Button>
      </div>
    );
  }
  if (!site.data || !pages.data) {
    return (
      <div aria-busy="true" className="space-y-3">
        <span className="sr-only">Chargement du menu</span>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-14 max-w-[760px] rounded-xl bg-border-row motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }
  const unpublished = new Set(Object.entries(states.data ?? {}).flatMap(([documentId, entry]) => (entry.state === 'draft' ? [documentId] : [])));
  return <MenuEditor site={site.data} pages={pages.data} unpublished={unpublished} />;
}
