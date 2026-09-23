/**
 * Réglages requis pour la conformité (mentions légales, accessibilité) : un point orange signale
 * dans le sommaire des réglages l'écran où il en manque un.
 */
import type { SiteSettings } from './site-settings';

export type SettingsScreenId = 'informations' | 'legal' | 'accessibilite' | 'reseaux' | 'demarches' | 'open-data';

const filled = (value: string | null | undefined) => !!value?.trim();

/** Écrans de réglages où un champ requis pour la conformité manque */
export function screensToComplete(site: SiteSettings): Set<SettingsScreenId> {
  const missing = new Set<SettingsScreenId>();
  // L'éditeur du site (la mairie) doit indiquer son adresse (LCEN, art. 6)
  if (!filled(site.address)) missing.add('informations');
  if (!filled(site.mentions_legales?.publication_director)) missing.add('legal');
  const level = site.accessibilite?.accessibility_level;
  if (!level || (level !== 'conforme' && !filled(site.accessibilite?.accessibility_schema_url)))
    missing.add('accessibilite');
  return missing;
}
