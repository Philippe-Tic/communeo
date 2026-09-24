/**
 * Page d'accueil en intentions (Site.homepage) : 15 sections fixes, chacune activable et, pour
 * certaines, réglable. Pas d'ordre : le thème décide de la mise en page. Les réglages d'une section
 * que le thème n'affiche pas sont conservés (changer de thème ne fait rien perdre).
 */
import { queryOptions } from '@tanstack/react-query';
import { HOMEPAGE_SECTIONS, isRichTextEmpty, type HomepageSectionId, type RichTextDocument } from '@communeo/core';
import { api } from './api';
import type { LibraryFile } from './media-library';

export const QUICK_LINK_ICONS = [
  { value: 'document', label: 'Document' },
  { value: 'identity', label: 'Carte d’identité' },
  { value: 'folder', label: 'Dossier' },
  { value: 'mail', label: 'Courrier' },
  { value: 'alert', label: 'Alerte' },
  { value: 'clock', label: 'Horaires' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'map', label: 'Plan' },
  { value: 'calendar', label: 'Calendrier' },
  { value: 'users', label: 'Habitants' },
  { value: 'building', label: 'Mairie' },
  { value: 'heart', label: 'Solidarité' },
  { value: 'info', label: 'Information' },
  { value: 'shield', label: 'Sécurité' },
  { value: 'book', label: 'Culture' },
  { value: 'globe', label: 'Tourisme' },
] as const;

export const KEY_FIGURE_ICONS = [
  { value: 'users', label: 'Habitants' },
  { value: 'map', label: 'Territoire' },
  { value: 'building', label: 'Bâtiment' },
  { value: 'calendar', label: 'Calendrier' },
  { value: 'heart', label: 'Solidarité' },
  { value: 'book', label: 'Culture' },
  { value: 'globe', label: 'Monde' },
  { value: 'shield', label: 'Sécurité' },
  { value: 'tree', label: 'Nature' },
  { value: 'star', label: 'Étoile' },
] as const;

export type QuickLinkIcon = (typeof QUICK_LINK_ICONS)[number]['value'];
export type KeyFigureIcon = (typeof KEY_FIGURE_ICONS)[number]['value'];

/** Sections sans réglage : on les affiche ou non, le contenu vient d'ailleurs */
export const TOGGLE_SECTIONS = [
  'practical_info',
  'weather',
  'waste_collection',
  'disruptions',
  'canteen',
  'newsletter',
] as const;
export const LISTING_SECTIONS = ['featured_news', 'agenda', 'associations'] as const;

export type HomepageValues = {
  hero: {
    enabled: boolean;
    title: string;
    subtitle: string;
    image: LibraryFile | null;
    primary_label: string;
    primary_url: string;
    secondary_label: string;
    secondary_url: string;
  };
  quick_links: {
    enabled: boolean;
    items: Array<{ label: string; url: string; description: string; icon: QuickLinkIcon | '' }>;
  };
  featured_news: { enabled: boolean; count: number };
  agenda: { enabled: boolean; count: number };
  associations: { enabled: boolean; count: number };
  mayor_word: {
    enabled: boolean;
    title: string;
    body: RichTextDocument;
    photo: LibraryFile | null;
    signature_name: string;
    signature_role: string;
  };
  key_figures: { enabled: boolean; items: Array<{ value: string; label: string; icon: KeyFigureIcon | '' }> };
  partners: { enabled: boolean; items: Array<{ name: string; logo: LibraryFile | null; url: string }> };
  free_content: { enabled: boolean; title: string; body: RichTextDocument };
  practical_info: { enabled: boolean };
  weather: { enabled: boolean };
  waste_collection: { enabled: boolean };
  disruptions: { enabled: boolean };
  canteen: { enabled: boolean };
  newsletter: { enabled: boolean };
  meta_description: string;
};

type Raw = Record<string, unknown> | null | undefined;

const nested = (section: string, fields: string[]) =>
  fields.map((field) => `populate[homepage][populate][${section}][populate][${field}]=true`);

/** Accueil complet : sections, éléments répétés et fichiers (image, photo, logos) */
export const homepageQuery = (siteDocumentId: string) =>
  queryOptions({
    queryKey: ['site-settings', siteDocumentId, 'homepage'],
    queryFn: async () => {
      const params = [
        'fields[0]=updatedAt',
        'fields[1]=theme',
        'fields[2]=name',
        ...nested('hero', ['image']),
        ...nested('mayor_word', ['photo']),
        'populate[homepage][populate][quick_links][populate][items]=true',
        'populate[homepage][populate][key_figures][populate][items]=true',
        'populate[homepage][populate][partners][populate][items][populate][logo]=true',
        ...[...LISTING_SECTIONS, ...TOGGLE_SECTIONS, 'free_content'].map(
          (section) => `populate[homepage][populate][${section}]=true`,
        ),
      ];
      const response = await api<{
        data: { documentId: string; updatedAt: string; theme: string | null; name: string; homepage: Raw };
      }>(`/api/sites/${siteDocumentId}?${params.join('&')}`);
      return response.data;
    },
    staleTime: 60_000,
  });

const str = (value: unknown) => (typeof value === 'string' ? value : '');
const on = (section: Raw) => !!section?.enabled;
const emptyDoc = (): RichTextDocument => ({ type: 'doc', content: [{ type: 'paragraph' }] });
const doc = (value: unknown) => (value && typeof value === 'object' ? (value as RichTextDocument) : emptyDoc());
const file = (value: unknown) => (value && typeof value === 'object' ? (value as LibraryFile) : null);
const items = (section: Raw) =>
  Array.isArray(section?.items) ? (section.items as Array<Record<string, unknown>>) : [];

export function toHomepageValues(homepage: Raw): HomepageValues {
  const home = (homepage ?? {}) as Record<string, Raw>;
  const listing = (id: (typeof LISTING_SECTIONS)[number]) => ({
    enabled: on(home[id]),
    count: typeof home[id]?.count === 'number' ? (home[id]!.count as number) : 3,
  });
  return {
    hero: {
      enabled: on(home.hero),
      title: str(home.hero?.title),
      subtitle: str(home.hero?.subtitle),
      image: file(home.hero?.image),
      primary_label: str(home.hero?.primary_label),
      primary_url: str(home.hero?.primary_url),
      secondary_label: str(home.hero?.secondary_label),
      secondary_url: str(home.hero?.secondary_url),
    },
    quick_links: {
      enabled: on(home.quick_links),
      items: items(home.quick_links).map((item) => ({
        label: str(item.label),
        url: str(item.url),
        description: str(item.description),
        icon: (str(item.icon) as QuickLinkIcon) || '',
      })),
    },
    featured_news: listing('featured_news'),
    agenda: listing('agenda'),
    associations: listing('associations'),
    mayor_word: {
      enabled: on(home.mayor_word),
      title: str(home.mayor_word?.title),
      body: doc(home.mayor_word?.body),
      photo: file(home.mayor_word?.photo),
      signature_name: str(home.mayor_word?.signature_name),
      signature_role: str(home.mayor_word?.signature_role),
    },
    key_figures: {
      enabled: on(home.key_figures),
      items: items(home.key_figures).map((item) => ({
        value: str(item.value),
        label: str(item.label),
        icon: (str(item.icon) as KeyFigureIcon) || '',
      })),
    },
    partners: {
      enabled: on(home.partners),
      items: items(home.partners).map((item) => ({ name: str(item.name), logo: file(item.logo), url: str(item.url) })),
    },
    free_content: {
      enabled: on(home.free_content),
      title: str(home.free_content?.title),
      body: doc(home.free_content?.body),
    },
    ...(Object.fromEntries(TOGGLE_SECTIONS.map((id) => [id, { enabled: on(home[id]) }])) as Record<
      (typeof TOGGLE_SECTIONS)[number],
      { enabled: boolean }
    >),
    meta_description: str(home.meta_description),
  };
}

const optional = (value: string) => value.trim() || null;
const richOrNull = (value: RichTextDocument) => (isRichTextEmpty(value) ? null : value);

/** Valeurs → données Strapi (le composant entier : les sections d'un thème qui ne les affiche pas restent) */
export function toHomepagePayload(values: HomepageValues) {
  const { hero, quick_links, mayor_word, key_figures, partners, free_content } = values;
  return {
    hero: {
      enabled: hero.enabled,
      title: optional(hero.title),
      subtitle: optional(hero.subtitle),
      image: hero.image?.id ?? null,
      primary_label: optional(hero.primary_label),
      primary_url: optional(hero.primary_url),
      secondary_label: optional(hero.secondary_label),
      secondary_url: optional(hero.secondary_url),
    },
    quick_links: {
      enabled: quick_links.enabled,
      items: quick_links.items.map((item) => ({
        label: item.label.trim(),
        url: item.url.trim(),
        description: optional(item.description),
        icon: item.icon || null,
      })),
    },
    ...Object.fromEntries(LISTING_SECTIONS.map((id) => [id, { enabled: values[id].enabled, count: values[id].count }])),
    mayor_word: {
      enabled: mayor_word.enabled,
      title: optional(mayor_word.title),
      body: richOrNull(mayor_word.body),
      photo: mayor_word.photo?.id ?? null,
      signature_name: optional(mayor_word.signature_name),
      signature_role: optional(mayor_word.signature_role),
    },
    key_figures: {
      enabled: key_figures.enabled,
      items: key_figures.items.map((item) => ({
        value: item.value.trim(),
        label: item.label.trim(),
        icon: item.icon || null,
      })),
    },
    partners: {
      enabled: partners.enabled,
      items: partners.items.map((item) => ({
        name: item.name.trim(),
        logo: item.logo?.id ?? null,
        url: optional(item.url),
      })),
    },
    free_content: {
      enabled: free_content.enabled,
      title: optional(free_content.title),
      body: richOrNull(free_content.body),
    },
    ...Object.fromEntries(TOGGLE_SECTIONS.map((id) => [id, { enabled: values[id].enabled }])),
    meta_description: optional(values.meta_description),
  };
}

export const sectionLabel = (id: HomepageSectionId) => HOMEPAGE_SECTIONS.find((section) => section.id === id)!.label;

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** Résumé d'une ligne : ce que la section affiche */
export function sectionSummary(
  id: HomepageSectionId,
  values: HomepageValues,
  context: { siteName: string; hasCoordinates: boolean },
): string {
  switch (id) {
    case 'hero':
      return `« ${values.hero.title.trim() || `Bienvenue à ${context.siteName}`} »`;
    case 'quick_links':
      return values.quick_links.items.length
        ? plural(values.quick_links.items.length, 'lien', 'liens')
        : 'Aucun lien pour l’instant';
    case 'featured_news':
      return values.featured_news.count > 1
        ? `${values.featured_news.count} dernières actualités publiées`
        : 'La dernière actualité publiée';
    case 'agenda':
      return values.agenda.count > 1 ? `${values.agenda.count} prochains événements` : 'Le prochain événement';
    case 'associations':
      return plural(values.associations.count, 'association', 'associations');
    case 'mayor_word': {
      const title = values.mayor_word.title.trim();
      const name = values.mayor_word.signature_name.trim();
      return [name, title && `« ${title} »`].filter(Boolean).join(' — ') || 'À rédiger';
    }
    case 'key_figures':
      return values.key_figures.items.length
        ? `${plural(values.key_figures.items.length, 'chiffre', 'chiffres')} : ${values.key_figures.items
            .map((item) => item.label.trim().toLowerCase())
            .filter(Boolean)
            .join(', ')}`
        : 'Aucun chiffre pour l’instant';
    case 'partners':
      return values.partners.items.length
        ? plural(values.partners.items.length, 'partenaire', 'partenaires')
        : 'Aucun partenaire pour l’instant';
    case 'free_content':
      return values.free_content.title.trim() ? `« ${values.free_content.title.trim()} »` : 'À rédiger';
    case 'practical_info':
      return 'Horaires et coordonnées de la mairie';
    case 'weather':
      return context.hasCoordinates
        ? 'Prévisions du jour pour la commune'
        : 'Coordonnées GPS à renseigner dans Informations de la commune';
    case 'waste_collection':
      return 'Prochains passages des collectes';
    case 'disruptions':
      return 'Affiche l’alerte en cours';
    case 'canteen':
      return 'Menu de la semaine';
    case 'newsletter':
      return 'Invitation à s’inscrire à la lettre d’information';
  }
}
