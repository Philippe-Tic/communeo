/**
 * Menus du site : navigation principale (7 entrées, un niveau de sous-menu, 10 liens par sous-menu)
 * et liens de pied de page. Stocké dans Site.navigation_config.
 */
import { z } from 'zod';

/** Rubriques générées par le site, avec leur adresse et leur libellé par défaut. */
export const SECTIONS = {
  actualites: { path: '/actualites', label: 'Actualités' },
  agenda: { path: '/agenda', label: 'Agenda' },
  documents: { path: '/documents', label: 'Documents officiels' },
  equipe: { path: '/equipe-municipale', label: 'Équipe municipale' },
  associations: { path: '/associations', label: 'Associations' },
  demarches: { path: '/demarches', label: 'Démarches' },
  dechets: { path: '/collecte-des-dechets', label: 'Collecte des déchets' },
  cantine: { path: '/cantine', label: 'Cantine scolaire' },
  perturbations: { path: '/perturbations', label: 'Perturbations et travaux' },
  contact: { path: '/contact', label: 'Contact' },
  'open-data': { path: '/open-data', label: 'Open data' },
} as const;

export type SectionKey = keyof typeof SECTIONS;
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

export const NAVIGATION_LIMITS = { main: 7, children: 10, footer: 12 } as const;

const label = z.string().trim().min(1).max(60);
const SAFE_URL = /^(https?:\/\/|mailto:|tel:)/i;

const linkItem = z.discriminatedUnion('type', [
  z.object({ type: z.literal('page'), pageDocumentId: z.string().min(1), label: label.nullish() }),
  z.object({ type: z.literal('section'), section: z.enum(SECTION_KEYS as [SectionKey, ...SectionKey[]]), label: label.nullish() }),
  z.object({ type: z.literal('external'), url: z.string().trim().regex(SAFE_URL, 'Lien non autorisé'), label }),
]);

const groupItem = z.object({
  type: z.literal('group'),
  label,
  children: z.array(linkItem).max(NAVIGATION_LIMITS.children, `Au plus ${NAVIGATION_LIMITS.children} liens par sous-menu`),
});

export const navigationConfigSchema = z.object({
  main: z.array(z.union([linkItem, groupItem])).max(NAVIGATION_LIMITS.main, `Au plus ${NAVIGATION_LIMITS.main} entrées`).default([]),
  footer: z.array(linkItem).max(NAVIGATION_LIMITS.footer).default([]),
});

export type NavigationLinkItem = z.infer<typeof linkItem>;
export type NavigationGroupItem = z.infer<typeof groupItem>;
export type NavigationConfig = z.infer<typeof navigationConfigSchema>;
