/**
 * Conformité du site d'une commune : 18 points en 5 catégories (mentions légales, RGPD, accessibilité,
 * publication des actes, cookies). Calcul pur, partagé par l'API (`GET /api/compliance`), l'écran
 * Conformité, le tableau de bord et l'assistant de création. Chaque point à faire mène à l'écran de
 * l'admin où on le complète ; la prochaine action est le point à faire le plus urgent.
 *
 * Certains points sont assurés par la plateforme (hébergeur, formulaire de contact, cookies) : ils
 * restent listés, pour que la commune sache qu'ils sont couverts.
 */
import { rgpdDaysLeft } from '../format/rgpd';

export type ComplianceCategoryId = 'mentions' | 'rgpd' | 'accessibilite' | 'actes' | 'cookies';

export const COMPLIANCE_CATEGORIES: Array<{ id: ComplianceCategoryId; label: string }> = [
  { id: 'mentions', label: 'Mentions légales' },
  { id: 'rgpd', label: 'RGPD' },
  { id: 'accessibilite', label: 'Accessibilité' },
  { id: 'actes', label: 'Publication des actes' },
  { id: 'cookies', label: 'Cookies' },
];

/** Écran de l'admin où l'on complète un point, avec ses paramètres de recherche */
export interface ComplianceTarget {
  to: string;
  search?: Record<string, string | boolean>;
  /** Réservé aux administrateurs de la commune (réglages légaux) */
  adminOnly?: boolean;
}

export interface CompliancePoint {
  id: string;
  category: ComplianceCategoryId;
  /** Libellé du point dans la liste ; précis quand il reste à faire (« 7 images sans texte alternatif ») */
  label: string;
  done: boolean;
  /** Ce qu'il reste à faire, en une phrase (prochaine action recommandée) */
  todo: string;
  /** Pourquoi, en une phrase (référence légale comprise) */
  why: string;
  target?: ComplianceTarget;
  /** Assuré par Communeo : rien à faire pour la commune */
  platform?: boolean;
}

export type ComplianceLevel = 'conforme' | 'partiellement-conforme' | 'non-conforme';

export interface ComplianceReport {
  points: CompliancePoint[];
  categories: Array<{ id: ComplianceCategoryId; label: string; done: number; total: number }>;
  done: number;
  total: number;
  /** Pourcentage de points faits, arrondi : un repère, la liste compte plus */
  score: number;
  level: ComplianceLevel;
  /** Point à faire le plus urgent */
  next: CompliancePoint | null;
}

export interface ComplianceInput {
  site: {
    name?: string | null;
    address?: string | null;
    contact_mail?: string | null;
    mentions_legales?: {
      siret?: string | null;
      publication_director?: string | null;
      hebergeur_name?: string | null;
      credits?: unknown;
    } | null;
    rgpd?: { rgpd_policy?: unknown; dpo_name?: string | null; dpo_email?: string | null } | null;
    accessibilite?: {
      accessibility_level?: string | null;
      accessibility_schema_url?: string | null;
      accessibility_action_plan_url?: string | null;
    } | null;
  };
  /** Documents officiels publiés de la commune */
  documents: Array<{ document_type?: string | null; year?: number | null; document_date?: string | null }>;
  /** Images de la médiathèque sans texte alternatif */
  imagesWithoutAlt: number;
  /** Dates de réception des demandes RGPD encore ouvertes */
  openRgpdRequests: Array<string | Date>;
  now?: Date;
}

const filled = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/** Texte riche (TipTap JSON, ou texte) contenant au moins un caractère visible */
export function hasText(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!value || typeof value !== 'object') return false;
  const node = value as { text?: unknown; content?: unknown };
  if (typeof node.text === 'string' && node.text.trim()) return true;
  return Array.isArray(node.content) && node.content.some(hasText);
}

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

// Ordre d'urgence de la prochaine action : délai RGPD dépassé d'abord, puis les obligations qui
// exposent la commune (éditeur, données personnelles, accessibilité), puis le reste
const URGENCY = [
  'rgpd-delai',
  'mentions-editeur',
  'mentions-directeur',
  'rgpd-politique',
  'rgpd-dpo',
  'rgpd-contact',
  'accessibilite-niveau',
  'actes-deliberations',
  'actes-pv',
  'actes-budget',
  'accessibilite-images',
  'accessibilite-schema',
  'accessibilite-plan',
  'mentions-hebergeur',
  'mentions-credits',
];

export function computeCompliance(input: ComplianceInput): ComplianceReport {
  const now = input.now ?? new Date();
  const { site } = input;
  const mentions = site.mentions_legales ?? {};
  const rgpd = site.rgpd ?? {};
  const a11y = site.accessibilite ?? {};
  const year = now.getFullYear();
  const published = (type: string) => input.documents.filter((document) => document.document_type === type);
  const yearOf = (document: ComplianceInput['documents'][number]) =>
    document.year ?? (document.document_date ? new Date(document.document_date).getFullYear() : null);
  // Le budget primitif est voté avant le 15 avril : jusque-là, celui de l'année passée suffit
  const budgetYear = now.getMonth() < 3 || (now.getMonth() === 3 && now.getDate() < 15) ? year - 1 : year;
  const overdue = input.openRgpdRequests.filter((receivedAt) => rgpdDaysLeft(receivedAt, now) < 0).length;
  const legal: ComplianceTarget = { to: '/mon-site/legal', adminOnly: true };
  const accessibility: ComplianceTarget = { to: '/mon-site/accessibilite', adminOnly: true };

  const points: CompliancePoint[] = [
    {
      id: 'mentions-editeur',
      category: 'mentions',
      label: 'Éditeur et SIRET',
      done: filled(site.name) && filled(site.address) && filled(mentions.siret),
      // L'éditeur (la mairie) est identifié par son adresse, dans les informations de la commune
      ...(filled(site.address)
        ? { todo: 'Indiquer le SIRET de la commune', target: legal }
        : { todo: "Indiquer l'adresse de la mairie", target: { to: '/mon-site/informations' } }),
      why: "L'éditeur du site doit être identifié : nom, adresse et SIRET (art. 6 LCEN).",
    },
    {
      id: 'mentions-hebergeur',
      category: 'mentions',
      label: 'Hébergeur',
      done: filled(mentions.hebergeur_name),
      todo: "Hébergeur non renseigné : contactez l'équipe Communeo",
      why: "L'hébergeur du site doit être indiqué (art. 6 LCEN). Communeo le renseigne pour vous.",
      platform: true,
    },
    {
      id: 'mentions-directeur',
      category: 'mentions',
      label: 'Directeur de publication',
      done: filled(mentions.publication_director),
      todo: 'Indiquer le directeur de publication',
      why: 'Le directeur de publication, en général le maire, doit être nommé (art. 6 LCEN).',
      target: legal,
    },
    {
      id: 'mentions-credits',
      category: 'mentions',
      label: 'Crédits',
      done: hasText(mentions.credits),
      todo: 'Indiquer les crédits (photos, réalisation)',
      why: 'Les auteurs des photos et illustrations doivent être crédités.',
      target: legal,
    },
    {
      id: 'rgpd-politique',
      category: 'rgpd',
      label: 'Politique de données',
      done: hasText(rgpd.rgpd_policy),
      todo: 'Rédiger la politique de données personnelles',
      why: 'Les habitants doivent savoir quelles données sont collectées et pourquoi (RGPD, art. 13).',
      target: legal,
    },
    {
      id: 'rgpd-dpo',
      category: 'rgpd',
      label: 'Délégué à la protection des données',
      done: filled(rgpd.dpo_name) && filled(rgpd.dpo_email),
      todo: 'Indiquer le délégué à la protection des données et son e-mail',
      why: 'Toute collectivité désigne un délégué à la protection des données (RGPD, art. 37).',
      target: legal,
    },
    {
      id: 'rgpd-contact',
      category: 'rgpd',
      label: 'Formulaire de contact conforme',
      done: filled(site.contact_mail),
      todo: "Indiquer l'e-mail de la mairie qui reçoit les messages",
      why: 'Les habitants doivent pouvoir saisir la mairie en ligne (art. L112-8 CRPA) ; le formulaire les informe de l’usage de leurs données.',
      target: { to: '/mon-site/informations' },
    },
    {
      id: 'rgpd-delai',
      category: 'rgpd',
      label: overdue
        ? `${plural(overdue, 'demande RGPD', 'demandes RGPD')} sans réponse après un mois`
        : 'Demandes RGPD traitées dans le délai',
      done: overdue === 0,
      todo: overdue > 1 ? 'Répondre aux demandes RGPD en retard' : 'Répondre à la demande RGPD en retard',
      why: 'Une demande sur les données personnelles doit recevoir une réponse sous un mois (RGPD, art. 12).',
      target: { to: '/messages', search: { categorie: 'rgpd' } },
    },
    {
      id: 'accessibilite-niveau',
      category: 'accessibilite',
      label: 'Niveau déclaré',
      done: filled(a11y.accessibility_level),
      todo: "Déclarer le niveau d'accessibilité du site",
      why: "Le site doit afficher son niveau de conformité au RGAA (art. 47 loi n° 2005-102).",
      target: accessibility,
    },
    {
      id: 'accessibilite-schema',
      category: 'accessibilite',
      label: 'Schéma pluriannuel',
      done: filled(a11y.accessibility_schema_url),
      todo: 'Publier le schéma pluriannuel de mise en accessibilité',
      why: 'Le schéma pluriannuel doit être publié (décret n° 2019-768).',
      target: accessibility,
    },
    {
      id: 'accessibilite-plan',
      category: 'accessibilite',
      label: "Plan d'action",
      done: filled(a11y.accessibility_action_plan_url),
      todo: "Publier le plan d'action de l'année",
      why: "Le plan d'action annuel accompagne le schéma pluriannuel (décret n° 2019-768).",
      target: accessibility,
    },
    {
      id: 'accessibilite-images',
      category: 'accessibilite',
      label: input.imagesWithoutAlt
        ? plural(input.imagesWithoutAlt, 'image sans texte alternatif', 'images sans texte alternatif')
        : 'Images avec texte alternatif',
      done: input.imagesWithoutAlt === 0,
      todo: `Décrire ${plural(input.imagesWithoutAlt, 'image', 'images')} de la médiathèque`,
      why: 'Chaque image doit être décrite pour les personnes qui ne la voient pas (RGAA, critère 1.1).',
      target: { to: '/mediatheque', search: { alt: true } },
    },
    {
      id: 'actes-pv',
      category: 'actes',
      label: 'Procès-verbaux du conseil',
      done: published('pv-conseil-municipal').length > 0,
      todo: 'Publier le procès-verbal du dernier conseil',
      why: 'Le procès-verbal de chaque séance est publié en ligne (art. L2121-15 CGCT).',
      target: { to: '/documents', search: { type: 'pv-conseil-municipal' } },
    },
    {
      id: 'actes-deliberations',
      category: 'actes',
      label: "Délibérations de l'année",
      done: published('deliberation').some((document) => yearOf(document) === year),
      todo: `Publier les délibérations de ${year}`,
      why: 'Les délibérations sont publiées en ligne pour être exécutoires (art. L2131-1 CGCT).',
      target: { to: '/documents', search: { type: 'deliberation' } },
    },
    {
      id: 'actes-budget',
      category: 'actes',
      label: 'Budget primitif',
      done: published('budget-primitif').some((document) => (yearOf(document) ?? 0) >= budgetYear),
      todo: `Publier le budget primitif ${budgetYear}`,
      why: 'Les documents budgétaires sont mis à la disposition du public (art. L2313-1 CGCT).',
      target: { to: '/documents', search: { type: 'budget-primitif' } },
    },
    {
      id: 'cookies-publicite',
      category: 'cookies',
      label: 'Aucun traceur publicitaire',
      done: true,
      todo: '',
      why: 'Les sites Communeo ne déposent aucun traceur publicitaire.',
      platform: true,
    },
    {
      id: 'cookies-audience',
      category: 'cookies',
      label: "Mesure d'audience exemptée",
      done: true,
      todo: '',
      why: "Aucune mesure d'audience ne demande de consentement : rien ne suit les visiteurs.",
      platform: true,
    },
    {
      id: 'cookies-videos',
      category: 'cookies',
      label: 'Vidéos : consentement avant chargement',
      done: true,
      todo: '',
      why: "Une vidéo d'un autre site (YouTube…) ne se charge qu'après l'accord du visiteur.",
      platform: true,
    },
  ];

  const done = points.filter((point) => point.done).length;
  const total = points.length;
  const rank = (point: CompliancePoint) => {
    const index = URGENCY.indexOf(point.id);
    return index === -1 ? URGENCY.length : index;
  };
  const next = points.filter((point) => !point.done).sort((a, b) => rank(a) - rank(b))[0] ?? null;

  return {
    points,
    categories: COMPLIANCE_CATEGORIES.map(({ id, label }) => {
      const inCategory = points.filter((point) => point.category === id);
      return { id, label, done: inCategory.filter((point) => point.done).length, total: inCategory.length };
    }),
    done,
    total,
    score: Math.round((done / total) * 100),
    level: done === total ? 'conforme' : done / total >= 0.5 ? 'partiellement-conforme' : 'non-conforme',
    next,
  };
}

export const COMPLIANCE_LEVEL_LABELS: Record<ComplianceLevel, string> = {
  conforme: 'conforme',
  'partiellement-conforme': 'partiellement conforme',
  'non-conforme': 'non conforme',
};
