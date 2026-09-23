/**
 * Liste des pages : premier type branché sur le gabarit (#134).
 */
import { pageQuery, pageToValues, savePageDraft } from '@/lib/content-api';
import type { ContentListConfig, ListRow, Media } from './types';

export interface PageRow extends ListRow {
  slug: string;
  show_in_menu: boolean | null;
  featured_image: Media | null;
}

export const PAGES_LIST: ContentListConfig<PageRow> = {
  source: { type: 'pages', fields: ['title', 'slug', 'show_in_menu'], media: ['featured_image'], searchField: 'title' },
  title: 'Pages',
  noun: { one: 'page', many: 'pages', feminine: true, definite: 'la page' },
  newLabel: 'Nouvelle page',
  editTo: '/pages/$documentId',
  thumbnail: (row) => row.featured_image,
  columns: [
    { id: 'adresse', header: 'Adresse', cell: (row) => <span className="text-secondary">/{row.slug}</span>, sortField: 'slug', sortLabel: 'adresse', wideOnly: true },
    { id: 'menu', header: 'Dans le menu', cell: (row) => (row.show_in_menu ? 'Oui' : <span className="text-secondary">Non</span>) },
  ],
  meta: (row) => [`/${row.slug}`, row.show_in_menu ? 'Dans le menu' : null],
  empty: {
    title: 'Créez votre première page',
    text: 'Une page présente une information durable : la mairie et ses horaires, un service, une démarche. Elle peut apparaître dans le menu du site.',
  },
  publicPath: (row) => `/${row.slug}`,
  duplicate: async (row, client) => {
    const draft = await client.fetchQuery(pageQuery(row.documentId));
    const copy = await savePageDraft(null, { ...pageToValues(draft), title: `${draft.title} (copie)`, slug: '', show_in_menu: false });
    return copy.documentId;
  },
};
