/**
 * Validation des réglages du Site à l'enregistrement : page d'accueil, menus, horaires et textes légaux.
 * Utilisée par le backend (refus des données invalides) et par l'admin (erreurs sous les champs).
 */
import { richTextDocumentSchema } from '../blocks/rich-text';
import { validateHomepage } from './homepage';
import { navigationConfigSchema } from './navigation';
import { openingHoursSchema } from './opening-hours';
import { isThemeAvailable, THEMES } from './themes';

export type SettingsIssue = { path: (string | number)[]; message: string };

const LEGAL_RICH_TEXTS: Array<[component: string, field: string]> = [
  ['mentions_legales', 'credits'],
  ['mentions_legales', 'mentions_legales_extra'],
  ['rgpd', 'rgpd_policy'],
  ['accessibilite', 'accessibility_declaration'],
];

type SettingsData = Record<string, unknown> & {
  infos_pratiques?: { opening_hours?: unknown } | null;
} & Partial<Record<string, Record<string, unknown> | null>>;

export function validateSiteSettings(data: SettingsData | null | undefined): { success: boolean; issues: SettingsIssue[] } {
  const issues: SettingsIssue[] = [];
  if (!data) return { success: true, issues };

  // Thème : seulement un thème construit (les autres ne peuvent être ni prévisualisés ni mis en ligne)
  const theme = data.theme as unknown;
  if (typeof theme === 'string' && THEMES.some((entry) => entry.id === theme) && !isThemeAvailable(theme)) {
    issues.push({ path: ['theme'], message: "Ce thème n'est pas encore disponible" });
  }

  if (data.homepage !== undefined) {
    for (const issue of validateHomepage(data.homepage).issues) issues.push({ ...issue, path: ['homepage', ...issue.path] });
  }

  if (data.navigation_config !== undefined && data.navigation_config !== null) {
    const result = navigationConfigSchema.safeParse(data.navigation_config);
    if (!result.success) {
      for (const issue of result.error.issues) issues.push({ path: ['navigation_config', ...(issue.path as (string | number)[])], message: issue.message });
    }
  }

  const hours = data.infos_pratiques?.opening_hours;
  if (hours !== undefined && hours !== null) {
    const result = openingHoursSchema.safeParse(hours);
    if (!result.success) {
      for (const issue of result.error.issues) {
        issues.push({ path: ['infos_pratiques', 'opening_hours', ...(issue.path as (string | number)[])], message: issue.message });
      }
    }
  }

  for (const [component, field] of LEGAL_RICH_TEXTS) {
    const value = (data[component] as Record<string, unknown> | null | undefined)?.[field];
    if (value === undefined || value === null) continue;
    const result = richTextDocumentSchema.safeParse(value);
    if (!result.success) issues.push({ path: [component, field], message: 'Texte riche invalide' });
  }

  return { success: issues.length === 0, issues };
}
