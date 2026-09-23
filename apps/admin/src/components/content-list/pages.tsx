/**
 * Liste des pages : premier type branché sur le gabarit (#134). « Dans le menu » vient du menu du
 * site (Site.navigation_config), pas d'un champ de la page.
 */
import { useQuery } from '@tanstack/react-query';
import { pageIdsInMenu } from '@/components/menu/model';
import { pageQuery, pageToValues, savePageDraft } from '@/lib/content-api';
import { sessionQuery } from '@/lib/session';
import { siteSettingsQuery } from '@/lib/site-settings';
import type { ContentListConfig, ListRow, Media } from './types';

export interface PageRow extends ListRow {
  slug: string;
  featured_image: Media | null;
}

function useMenuPages(): Set<string> | undefined {
  const { data: session } = useQuery(sessionQuery);
  const siteId = session?.site?.documentId;
  const { data } = useQuery({ ...siteSettingsQuery(siteId ?? ''), enabled: !!siteId });
  return data ? pageIdsInMenu(data.navigation_config) : undefined;
}

function InMenu({ documentId }: { documentId: string }) {
  const pages = useMenuPages();
  if (!pages) return null;
  return pages.has(documentId) ? 'Oui' : <span className="text-secondary">Non</span>;
}

export const PAGES_LIST: ContentListConfig<PageRow> = {
  source: { type: 'pages', fields: ['title', 'slug'], media: ['featured_image'], searchField: 'title' },
  title: 'Pages',
  noun: { one: 'page', many: 'pages', feminine: true, definite: 'la page' },
  newLabel: 'Nouvelle page',
  editTo: '/pages/$documentId',
  thumbnail: (row) => row.featured_image,
  columns: [
    { id: 'adresse', header: 'Adresse', cell: (row) => <span className="text-secondary">/{row.slug}</span>, sortField: 'slug', sortLabel: 'adresse', wideOnly: true },
    { id: 'menu', header: 'Dans le menu', cell: (row) => <InMenu documentId={row.documentId} /> },
  ],
  meta: (row) => [`/${row.slug}`],
  empty: {
    title: 'Créez votre première page',
    text: 'Une page présente une information durable : la mairie et ses horaires, un service, une démarche. Elle peut apparaître dans le menu du site.',
  },
  publicPath: (row) => `/${row.slug}`,
  duplicate: async (row, client) => {
    const draft = await client.fetchQuery(pageQuery(row.documentId));
    const copy = await savePageDraft(null, { ...pageToValues(draft), title: `${draft.title} (copie)`, slug: '' });
    return copy.documentId;
  },
};
