/**
 * Liste des événements (gabarit #134) : dates, lieu, catégorie ; filtres période (à venir / passés)
 * et catégorie ; tri par date de début.
 */
import { EVENT_CATEGORY_LABELS, formatEventPeriod } from '@communeo/core';
import { EVENT_CATEGORIES, EVENT_EDITOR, eventsApi } from '@/components/editor/event-editor';
import type { ContentListConfig, ListRow, Media } from './types';

export interface EventRow extends ListRow {
  slug: string;
  category: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  image: Media | null;
}

/** Début du jour (heure du navigateur), stable toute la journée : clé de cache des listes */
function today(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

const period = (row: EventRow) => (row.start_date ? formatEventPeriod(row.start_date, row.end_date) : 'Dates à préciser');

export const EVENTS_LIST: ContentListConfig<EventRow> = {
  source: { type: 'evenements', fields: ['title', 'slug', 'category', 'start_date', 'end_date', 'location'], media: ['image'], searchField: 'title' },
  title: 'Agenda',
  noun: { one: 'événement', many: 'événements', feminine: false, definite: "l'événement" },
  newLabel: 'Nouvel événement',
  editTo: '/agenda/$documentId',
  thumbnail: (row) => row.image,
  columns: [
    { id: 'dates', header: 'Dates', cell: (row) => period(row), sortField: 'start_date', sortLabel: 'date de début' },
    { id: 'lieu', header: 'Lieu', cell: (row) => row.location, wideOnly: true },
    { id: 'categorie', header: 'Catégorie', cell: (row) => (row.category ? EVENT_CATEGORY_LABELS[row.category] : null), wideOnly: true },
  ],
  meta: (row) => [period(row), row.location],
  defaultSort: { field: 'start_date', order: 'desc' },
  filters: [
    {
      key: 'periode',
      label: 'Période',
      options: [
        { value: 'a-venir', label: 'À venir' },
        { value: 'passes', label: 'Passés' },
      ],
      // À venir : pas encore terminé (fin, ou début pour un événement sans fin, après aujourd'hui)
      query: (value): Record<string, string> => {
        const start = today();
        return value === 'a-venir'
          ? { 'filters[$or][0][end_date][$gte]': start, 'filters[$or][1][start_date][$gte]': start }
          : { 'filters[$or][0][end_date][$lt]': start, 'filters[$or][1][$and][0][end_date][$null]': 'true', 'filters[$or][1][$and][1][start_date][$lt]': start };
      },
    },
    { key: 'categorie', label: 'Catégorie', field: 'category', options: EVENT_CATEGORIES },
  ],
  empty: {
    title: 'Annoncez votre premier événement',
    text: "Un événement apparaît dans l'agenda du site et sur la page d'accueil : dates, lieu, et de quoi s'inscrire si besoin.",
  },
  publicPath: (row) => `/agenda/${row.slug}`,
  duplicate: async (row, client) => {
    const draft = await client.fetchQuery(eventsApi.query(row.documentId));
    const copy = await eventsApi.saveDraft(null, { ...EVENT_EDITOR.toValues(draft, undefined), title: `${draft.title} (copie)`, slug: '', featured: false });
    return copy.documentId;
  },
};
