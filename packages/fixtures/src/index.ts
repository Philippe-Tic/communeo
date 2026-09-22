export { demarcheThemes } from './demarches';
/**
 * Commune de démonstration pour développer et tester les thèmes sans Strapi.
 *
 *   const source = createContentSource(createFixtureLoader(), FIXTURE_CONTEXT, { now: FIXTURE_NOW });
 *
 * Les données sont au format de l'API Strapi : elles passent par les mêmes conversions que la production.
 */
import type { MapContext, RawLoader, Site } from '@communeo/core';
import { FIXTURE_NOW } from './builders';
import * as saintAubin from './saint-aubin';

export { FIXTURE_NOW };

/** Dossier des images et fichiers des fixtures, à servir sous /fixtures */
export const FIXTURE_ASSETS_DIR = new URL('../assets/', import.meta.url);

export const FIXTURE_CONTEXT: MapContext = { siteUrl: 'https://saint-aubin-sur-loire.fr', mediaUrl: '' };

export type FixtureVariant =
  /** Toutes les sections et tous les contenus */
  | 'complete'
  /** Accueil réduit (accroche, actualités, infos pratiques) et aucune image */
  | 'minimal'
  /** Aucun contenu : états vides */
  | 'empty';

export interface FixtureOptions {
  variant?: FixtureVariant;
  /** Logo horizontal (par défaut) ou blason */
  logo?: 'horizontal' | 'blason';
  /** Ajoute une alerte urgente (troisième niveau de sévérité) */
  criticalAlert?: boolean;
}

const stripImages = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value), (key, val) => (['image', 'featured_image', 'photo', 'logo'].includes(key) ? null : val));

function minimalSite(site: Site): Site {
  const homepage = site.homepage!;
  const off = { enabled: false };
  return {
    ...site,
    homepage: {
      ...homepage,
      quick_links: { ...homepage.quick_links!, ...off },
      agenda: { ...homepage.agenda!, ...off },
      mayor_word: { ...homepage.mayor_word!, ...off },
      key_figures: { ...homepage.key_figures!, ...off },
      weather: { ...homepage.weather!, ...off },
      waste_collection: { ...homepage.waste_collection!, ...off },
      disruptions: { ...homepage.disruptions!, ...off },
      canteen: { ...homepage.canteen!, ...off },
      associations: { ...homepage.associations!, ...off },
      partners: { ...homepage.partners!, ...off },
      newsletter: { ...homepage.newsletter!, ...off },
      free_content: { ...homepage.free_content!, ...off },
      hero: { ...homepage.hero!, image: null },
    },
  };
}

export function createFixtureLoader(options: FixtureOptions = {}): RawLoader {
  const variant = options.variant ?? 'complete';
  const empty = variant === 'empty';
  const transform = <T>(value: T): T => (variant === 'minimal' ? stripImages(value) : value);
  const list = <T>(items: () => T[]) => async () => (empty ? [] : transform(items()));

  return {
    site: async () => {
      const site = saintAubin.site(options.logo);
      return variant === 'minimal' ? minimalSite(transform(site)) : site;
    },
    pages: list(saintAubin.pages),
    articles: list(saintAubin.articles),
    events: list(saintAubin.events),
    documents: list(saintAubin.documents),
    team: list(saintAubin.team),
    // Même filtres que l'API : seulement les associations publiées, alertes et collectes actives
    associations: list(() => saintAubin.associations().filter((association) => association.status === 'published')),
    alerts: list(() => [...(options.criticalAlert ? [saintAubin.criticalAlert()] : []), ...saintAubin.alerts()].filter((alert) => alert.active)),
    waste: list(() => saintAubin.waste().filter((schedule) => schedule.active)),
    canteen: list(saintAubin.canteen),
  };
}
