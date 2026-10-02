/** Adresses et libellés communs à tout le site de Communeo */
export const APP_URL = 'https://app.communeo.fr';
export const TRIAL_URL = `${APP_URL}/inscription`;
export const LOGIN_URL = `${APP_URL}/connexion`;
export const DOC_URL = 'https://doc.communeo.fr';
export const CONTACT_EMAIL = 'contact@communeo.fr';
/** Démonstration publique (#359) : la commune fictive dans un thème, construite avec le site (scripts/demo.mjs) */
export const demoUrl = (theme = 'institutionnel') => `/demo/${theme}/`;
/** Envoi du formulaire de contact (route publique de Strapi) */
export const CONTACT_ENDPOINT = `${import.meta.env.PUBLIC_API_URL ?? APP_URL}/api/prospect-contact`;

export type NavKey = 'fonctionnalites' | 'themes' | 'tarifs' | 'comment' | 'questions';

export const NAV: Array<{ key: NavKey; label: string; href: string }> = [
  { key: 'fonctionnalites', label: 'Fonctionnalités', href: '/fonctionnalites' },
  { key: 'themes', label: 'Thèmes', href: '/themes' },
  { key: 'tarifs', label: 'Tarifs', href: '/tarifs' },
  { key: 'comment', label: 'Comment ça marche', href: '/comment-ca-marche' },
  { key: 'questions', label: 'Questions', href: '/questions' },
];

export const LEGAL = [
  { label: 'Mentions légales', href: '/mentions-legales' },
  { label: 'Conditions générales', href: '/conditions' },
  { label: 'Données personnelles', href: '/donnees-personnelles' },
  { label: 'Accessibilité', href: '/accessibilite' },
  { label: 'Plan du site', href: '/plan-du-site' },
];
