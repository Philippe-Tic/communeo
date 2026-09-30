/** Écrans de V1 (premier jet : à compléter en montant la vidéo) */
import type { Plan } from '../../lib/plans';

export const captures: Plan[] = [
  {
    nom: 'inscription',
    ou: 'admin',
    chemin: '/inscription',
    options: { loggedIn: false },
    url: 'app.communeo.fr/inscription',
    elements: {
      commune: (p) => p.getByLabel(/^Votre commune/),
      prenom: (p) => p.getByLabel(/^Prénom/),
      nom: (p) => p.getByLabel(/^Nom/),
      email: (p) => p.getByLabel(/^Votre e-mail/),
    },
  },
  { nom: 'assistant', ou: 'admin', chemin: '/assistant?etape=2', options: { onboarding: { step: 2 } }, url: 'app.communeo.fr/assistant' },
  { nom: 'tableau-de-bord', ou: 'admin', chemin: '/', url: 'app.communeo.fr' },
  { nom: 'page-editeur', ou: 'admin', chemin: '/pages/p-salle', url: 'app.communeo.fr/pages/location-de-la-salle-des-fetes' },
  {
    nom: 'mise-en-ligne',
    ou: 'admin',
    chemin: '/mise-en-ligne',
    options: { publication: 'pending' },
    url: 'app.communeo.fr/mise-en-ligne',
    elements: { bouton: (p) => p.getByRole('button', { name: 'Mettre en ligne' }) },
  },
  { nom: 'site-accueil', ou: 'site', chemin: '/', url: 'saint-aubin.communeo.fr' },
  { nom: 'site-accueil-mobile', ou: 'site', chemin: '/', appareil: 'telephone', url: 'saint-aubin.communeo.fr' },
  { nom: 'site-demarches', ou: 'site', chemin: '/demarches', url: 'saint-aubin.communeo.fr/demarches' },
];
