/** Libellés français des valeurs d'énumération, partagés par les thèmes et l'admin. */

export const ARTICLE_CATEGORY_LABELS = {
  news: 'Actualité',
  event: 'Événement',
  information: 'Information',
  emergency: 'Urgence',
} as const;

export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  cultural: 'Culture',
  sport: 'Sport',
  meeting: 'Réunion',
  celebration: 'Fête',
  workshop: 'Atelier',
  conference: 'Conférence',
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'pv-conseil-municipal': 'Procès-verbal de conseil municipal',
  deliberation: 'Délibération',
  arrete: 'Arrêté',
  plu: "Plan local d'urbanisme (PLU)",
  scot: 'Schéma de cohérence territoriale (SCOT)',
  'carte-communale': 'Carte communale',
  'budget-primitif': 'Budget primitif',
  'compte-administratif': 'Compte administratif',
  'rapport-orientations-budgetaires': "Rapport d'orientations budgétaires",
  autre: 'Autre document',
};

export const ASSOCIATION_CATEGORY_LABELS: Record<string, string> = {
  sport: 'Sport',
  culture: 'Culture',
  social: 'Social et solidarité',
  environnement: 'Environnement',
  education: 'Éducation et jeunesse',
  autre: 'Autre',
};

export const ALERT_SEVERITY_LABELS = { info: 'Information', warning: 'Attention', critical: 'Urgent' } as const;

export const ALERT_TYPE_LABELS: Record<string, string> = {
  travaux: 'Travaux',
  'coupure-eau': "Coupure d'eau",
  'coupure-electricite': "Coupure d'électricité",
  deviation: 'Déviation',
  intemperie: 'Intempérie',
  autre: 'Autre',
};

export const CALLOUT_LABELS = { info: 'Information', warning: 'Attention', important: 'Important', tip: 'Conseil' } as const;

export const WASTE_TYPES: Record<string, { label: string; abbreviation: string }> = {
  'ordures-menageres': { label: 'Ordures ménagères', abbreviation: 'OM' },
  'tri-selectif': { label: 'Tri sélectif', abbreviation: 'TRI' },
  verre: { label: 'Verre', abbreviation: 'VER' },
  'dechets-verts': { label: 'Déchets verts', abbreviation: 'DV' },
  encombrants: { label: 'Encombrants', abbreviation: 'ENC' },
};

export const WASTE_FREQUENCY_LABELS: Record<string, string> = {
  hebdomadaire: 'Chaque semaine',
  bimensuel: 'Toutes les deux semaines',
  mensuel: 'Une fois par mois',
};

export const FRENCH_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;

export const TEAM_ROLE_TITLES: Record<string, string> = {
  maire: 'Maire',
  adjoint: 'Adjoint au maire',
  conseiller: 'Conseiller municipal',
  dgs: 'Directeur général des services',
  agent: 'Agent municipal',
};

export const TEAM_GROUPS = [
  { key: 'maire', label: 'Maire', roles: ['maire'] },
  { key: 'adjoints', label: 'Adjoints', roles: ['adjoint'] },
  { key: 'conseillers', label: 'Conseillers municipaux', roles: ['conseiller'] },
  { key: 'services', label: 'Services de la mairie', roles: ['dgs', 'agent'] },
] as const;

export const ACCESSIBILITY_LEVEL_LABELS = {
  'non-conforme': 'Non conforme',
  'partiellement-conforme': 'Partiellement conforme',
  conforme: 'Totalement conforme',
} as const;

export const CANTEEN_COURSES = [
  { key: 'starter', label: 'Entrée', field: 'starter' },
  { key: 'main', label: 'Plat', field: 'main_course' },
  { key: 'side', label: 'Accompagnement', field: 'side_dish' },
  { key: 'dairy', label: 'Produit laitier', field: 'dairy' },
  { key: 'dessert', label: 'Dessert', field: 'dessert' },
  { key: 'snack', label: 'Goûter', field: 'snack' },
] as const;

export const CANTEEN_BADGE_LABELS: Record<string, string> = {
  bio: 'Bio',
  local: 'Local',
  'fait-maison': 'Fait maison',
  vegetarien: 'Végétarien',
};

/** Liens légaux obligatoires du pied de page, communs à tous les thèmes. */
export const LEGAL_PAGES = {
  mentions: { path: '/mentions-legales', label: 'Mentions légales' },
  privacy: { path: '/donnees-personnelles', label: 'Données personnelles' },
  accessibility: { path: '/accessibilite', label: 'Accessibilité' },
  cookies: { path: '/gestion-des-cookies', label: 'Gestion des cookies' },
  sitemap: { path: '/plan-du-site', label: 'Plan du site' },
  rights: { path: '/exercer-mes-droits', label: 'Exercer mes droits' },
} as const;
