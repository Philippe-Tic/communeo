import type { LinkKey } from '../types/strapi';

export interface LinkMeta {
  defaultLabel: string;
  url: string;
}

export const LINK_MAP: Record<LinkKey, LinkMeta> = {
  'articles':     { defaultLabel: 'Actualités',        url: '/actualites' },
  'evenements':   { defaultLabel: 'Événements',        url: '/evenements' },
  'documents':    { defaultLabel: 'Documents',         url: '/documents' },
  'equipe':       { defaultLabel: 'Équipe municipale', url: '/equipe-municipale' },
  'associations': { defaultLabel: 'Associations',      url: '/associations' },
  'demarches':    { defaultLabel: 'Démarches',         url: '/demarches' },
  'open-data':    { defaultLabel: 'Open Data',         url: '/open-data' },
  'collecte-dechets': { defaultLabel: 'Collecte des déchets', url: '/collecte-dechets' },
  'perturbations':    { defaultLabel: 'Perturbations',       url: '/perturbations' },
  'cantine':          { defaultLabel: 'Cantine scolaire',    url: '/cantine' },
};
