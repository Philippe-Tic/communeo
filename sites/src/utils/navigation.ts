import type { SectionKey } from '../types/strapi';

export interface SectionMeta {
  defaultLabel: string;
  url: string;
}

export const SECTION_MAP: Record<SectionKey, SectionMeta> = {
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
