/**
 * Checklist « Pour terminer votre site » (#154, handoff 6.6 variante 1g et 6.18 Succès) : après
 * l'assistant de création, les sept points qui font un site complet. Visible sur le tableau de bord
 * jusqu'à ce qu'ils soient faits (ou masquée par la commune) ; l'écran de succès de l'assistant en
 * reprend les trois premiers à faire.
 */
import { hasText, type ComplianceTarget } from './compliance';

export type ChecklistItemId =
  | 'informations'
  | 'logo'
  | 'mentions'
  | 'donnees'
  | 'accessibilite'
  | 'pages'
  | 'domaine';

export interface ChecklistItem {
  id: ChecklistItemId;
  label: string;
  done: boolean;
  /** Ce qu'il reste à faire, en une phrase */
  todo: string;
  target: ComplianceTarget;
}

export interface OnboardingChecklist {
  items: ChecklistItem[];
  done: number;
  total: number;
  /** Points à faire, du plus urgent au moins urgent */
  todo: ChecklistItem[];
}

export interface ChecklistInput {
  site: {
    address?: string | null;
    contact_phone?: string | null;
    contact_mail?: string | null;
    hasLogo: boolean;
    mentions_legales?: { siret?: string | null; publication_director?: string | null } | null;
    rgpd?: { dpo_name?: string | null; dpo_email?: string | null } | null;
    accessibilite?: { accessibility_declaration?: unknown } | null;
    custom_domain?: string | null;
    domain_status?: string | null;
  };
  /** Pages de la commune : publiées, et créées depuis un modèle mais jamais publiées */
  pages: { published: number; templateDrafts: number };
}

const filled = (value: string | null | undefined) => !!value?.trim();
const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

// Les obligations légales d'abord, puis ce qui rend le site utile, le domaine en dernier
const URGENCY: ChecklistItemId[] = ['mentions', 'donnees', 'accessibilite', 'pages', 'informations', 'logo', 'domaine'];

export function onboardingChecklist({ site, pages }: ChecklistInput): OnboardingChecklist {
  const legal: ComplianceTarget = { to: '/mon-site/legal', adminOnly: true };
  const informations: ComplianceTarget = { to: '/mon-site/informations', adminOnly: true };
  const missingContact = [
    !filled(site.address) && 'adresse',
    !filled(site.contact_phone) && 'téléphone',
    !filled(site.contact_mail) && 'e-mail',
  ].filter((entry): entry is string => !!entry);
  const missingLegal = [
    !filled(site.mentions_legales?.siret) && 'SIRET',
    !filled(site.mentions_legales?.publication_director) && 'directeur de publication',
  ].filter((entry): entry is string => !!entry);
  const domainPending = filled(site.custom_domain) && site.domain_status !== 'verified';

  const items: ChecklistItem[] = [
    {
      id: 'informations',
      label: 'Informations de la commune',
      done: missingContact.length === 0,
      todo: `Compléter les coordonnées de la mairie (${missingContact.join(', ')})`,
      target: informations,
    },
    {
      id: 'logo',
      label: 'Logo et thème',
      done: site.hasLogo,
      todo: 'Ajouter le logo de la commune',
      target: informations,
    },
    {
      id: 'mentions',
      label: 'Mentions légales',
      done: missingLegal.length === 0,
      todo: `Compléter les mentions légales (${missingLegal.join(', ')})`,
      target: legal,
    },
    {
      id: 'donnees',
      label: 'Délégué à la protection des données',
      done: filled(site.rgpd?.dpo_name) && filled(site.rgpd?.dpo_email),
      todo: 'Indiquer le délégué à la protection des données',
      target: legal,
    },
    {
      id: 'accessibilite',
      label: "Déclaration d'accessibilité",
      done: hasText(site.accessibilite?.accessibility_declaration),
      todo: "Rédiger la déclaration d'accessibilité",
      target: { to: '/mon-site/accessibilite', adminOnly: true },
    },
    {
      id: 'pages',
      label: 'Premières pages publiées',
      done: pages.published > 0 && pages.templateDrafts === 0,
      todo:
        pages.templateDrafts > 0
          ? `Relire et publier ${pages.templateDrafts > 1 ? `les ${plural(pages.templateDrafts, 'page', 'pages')}` : 'la page'} en brouillon`
          : 'Publier une première page',
      target: pages.templateDrafts > 0 ? { to: '/pages', search: { statut: 'brouillon' } } : { to: '/pages' },
    },
    {
      id: 'domaine',
      label: 'Domaine personnalisé',
      done: filled(site.custom_domain) && site.domain_status === 'verified',
      todo: domainPending
        ? `Terminer la configuration de ${site.custom_domain!.trim()}`
        : 'Ajouter votre nom de domaine',
      target: { to: '/mise-en-ligne', adminOnly: true },
    },
  ];

  const done = items.filter((item) => item.done).length;
  const todo = URGENCY.map((id) => items.find((item) => item.id === id)!).filter((item) => !item.done);
  return { items, done, total: items.length, todo };
}
