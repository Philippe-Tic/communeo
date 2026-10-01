/**
 * Écrans de V1 (démonstration), dans l'ordre du montage. Chaque état est obtenu par l'interface ou par
 * des données de démonstration (réponses de l'API simulée), jamais en retouchant les images.
 */
import type { Page, Route } from '@playwright/test';
import type { Plan } from '../../lib/plans';

const json = (route: Route, body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

// ---------------------------------------------------------------------------------------------------
// 1. Inscription

/** Recherche de commune à l'inscription : Saint-Aubin-sur-Loire libre (le mock des tests la dit déjà inscrite) */
async function communeLibre(page: Page) {
  await page.route('**/api/signup/communes**', (route) =>
    json(route, { data: [{ name: 'Saint-Aubin-sur-Loire', insee: '58236', postalCodes: ['58300'], population: 3240, department: 'Nièvre', taken: false }] }),
  );
}

const suggestions = (page: Page) => page.getByRole('list', { name: 'Communes trouvées' }).getByRole('button').first();

async function chercherCommune(page: Page) {
  await page.getByLabel(/^Votre commune/).pressSequentially('Saint-Au', { delay: 40 });
  await suggestions(page).waitFor();
}

async function choisirCommune(page: Page) {
  await chercherCommune(page);
  await suggestions(page).click();
  // Le curseur de saisie passe au champ suivant, comme après un vrai choix
  await page.getByLabel(/^Prénom/).focus();
}

async function remplirInscription(page: Page) {
  await choisirCommune(page);
  await page.getByLabel(/^Prénom/).fill('Sophie');
  await page.getByLabel(/^Nom/).fill('Leroy');
  await page.getByLabel(/^Votre e-mail/).fill('secretariat@saint-aubin-sur-loire.fr');
  await page.getByLabel(/^Votre e-mail/).blur();
}

const INSCRIPTION = {
  commune: (p: Page) => p.getByLabel(/^Votre commune/),
  prenom: (p: Page) => p.getByLabel(/^Prénom/),
  nom: (p: Page) => p.getByLabel(/^Nom/),
  email: (p: Page) => p.getByLabel(/^Votre e-mail/),
  formulaire: (p: Page) => p.locator('form').first(),
};
const inscription = (nom: string, avant?: (page: Page) => Promise<void>, elements: Plan['elements'] = {}): Plan => ({
  nom,
  ou: 'admin',
  chemin: '/inscription',
  options: { loggedIn: false },
  url: 'app.communeo.fr/inscription',
  donnees: communeLibre,
  avant,
  elements: { ...INSCRIPTION, ...elements },
});

// ---------------------------------------------------------------------------------------------------
// 2. Assistant de création : commune tout juste inscrite, les données publiques arrivent

/** Détails de la commune retardés : l'écran reste sur « recherche des données publiques » */
async function detailsEnAttente(page: Page) {
  await page.route('**/api/onboarding/communes/58236', () => new Promise(() => undefined));
}

const suggestionAssistant = (page: Page) => page.getByRole('list', { name: 'Communes trouvées' }).getByRole('button').first();
const ASSISTANT = {
  population: (p: Page) => p.getByLabel(/^Population/),
  adresse: (p: Page) => p.getByLabel(/^Adresse de la mairie/),
  telephone: (p: Page) => p.getByLabel(/^Téléphone/),
  email: (p: Page) => p.getByLabel(/^E-mail/),
  gps: (p: Page) => p.getByLabel(/^Coordonnées GPS/),
  horaires: (p: Page) => p.getByText('Horaires d’ouverture').or(p.getByText("Horaires d'ouverture")).first().locator('..'),
  continuer: (p: Page) => p.getByRole('button', { name: 'Continuer' }),
};
const assistantCommune = (nom: string, donnees?: (page: Page) => Promise<void>, avant?: (page: Page) => Promise<void>, elements: Plan['elements'] = {}): Plan => ({
  nom,
  ou: 'admin',
  chemin: '/assistant?etape=2',
  options: { onboarding: { step: 2 }, freshCommune: true },
  url: 'app.communeo.fr/assistant',
  donnees,
  avant,
  elements: { ...ASSISTANT, ...elements },
});

const THEME = {
  institutionnel: (p: Page) => p.locator('label', { hasText: 'Institutionnel' }).first(),
  continuer: (p: Page) => p.getByRole('button', { name: /^Continuer avec/ }),
};

// ---------------------------------------------------------------------------------------------------
// 3. Tableau de bord et éditeur de la page « Location de la salle des fêtes »

const EDITEUR = {
  texte: (p: Page) => p.locator('[data-block-toggle]').first(),
  ajouter: (p: Page) => p.getByRole('button', { name: 'Ajouter un bloc', exact: true }).last(),
  enregistrement: (p: Page) => p.getByText(/Brouillon enregistré/).first(),
  apercu: (p: Page) => p.getByRole('button', { name: 'Aperçu plein écran' }),
  mettreEnLigne: (p: Page) => p.getByRole('button', { name: 'Mettre en ligne', exact: true }).first(),
};

const PHRASE = ' Pensez à réserver deux mois à l’avance.';

async function ouvrirTexte(page: Page) {
  await page.locator('[data-block-toggle]').first().click();
  const zone = page.locator('.ProseMirror').first();
  await zone.waitFor();
  await zone.evaluate((el) => el.scrollIntoView({ block: 'center' }));
}

async function taperTexte(page: Page) {
  await ouvrirTexte(page);
  const zone = page.locator('.ProseMirror').first();
  await zone.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type(PHRASE, { delay: 10 });
}

async function catalogue(page: Page) {
  await taperTexte(page);
  await page.getByRole('button', { name: 'Ajouter un bloc', exact: true }).last().click();
  await page.getByRole('dialog', { name: 'Ajouter un bloc' }).waitFor();
}

async function ajouterImage(page: Page) {
  await catalogue(page);
  await page.getByRole('dialog', { name: 'Ajouter un bloc' }).getByRole('button', { name: 'Image' }).click();
  await page.getByRole('region', { name: /Contenu de la page/ }).getByRole('button', { name: 'Choisir une image' }).last().click();
  const choix = page.getByRole('dialog', { name: 'Choisir une image' });
  await choix.getByRole('button', { name: /salle-des-fetes-exterieur/ }).click();
  await choix.getByRole('button', { name: "Insérer l'image" }).click();
  await choix.waitFor({ state: 'hidden' });
}

async function ajouterDocument(page: Page) {
  await ajouterImage(page);
  await page.getByRole('button', { name: 'Ajouter un bloc', exact: true }).last().click();
  await page.getByRole('dialog', { name: 'Ajouter un bloc' }).getByRole('button', { name: 'Documents' }).click();
  await page.getByRole('button', { name: 'Choisir des documents' }).click();
  const choix = page.getByRole('dialog', { name: 'Ajouter des documents' });
  await choix.getByRole('button', { name: /reglement-salle/ }).click();
  await choix.getByRole('button', { name: 'Ajouter les documents' }).click();
  await page.getByText('reglement-salle.pdf').first().scrollIntoViewIfNeeded();
}

async function enregistre(page: Page) {
  await ajouterDocument(page);
  // L'enregistrement automatique part quelques secondes après la dernière saisie
  await page.getByText(/Brouillon enregistré/).first().waitFor({ timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function apercuPleinEcran(page: Page) {
  await page.getByRole('button', { name: 'Aperçu plein écran' }).first().click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(1500);
}

const editeur = (nom: string, avant?: (page: Page) => Promise<void>, elements: Plan['elements'] = {}): Plan => ({
  nom,
  ou: 'admin',
  chemin: '/pages/p-salle',
  url: 'app.communeo.fr/pages/location-de-la-salle-des-fetes',
  avant,
  elements: { ...elements },
});

// ---------------------------------------------------------------------------------------------------
// 4. Mise en ligne : chaque étape, puis « en ligne » (état de la file simulé)

const sophie = { firstName: 'Sophie', lastName: 'Leroy' };
const etatMiseEnLigne = (step: string | null) => async (page: Page) => {
  await page.route('**/api/deployment/state', (route) =>
    json(route, {
      state: step ? 'running' : 'ok',
      pendingCount: 0,
      step,
      reference: null,
      scheduledAt: null,
      lastDeployment: {
        status: step ? 'building' : 'ready',
        reason: 'manual',
        reference: 'MEL-2026-1006-1002',
        step,
        triggeredAt: '2026-10-06T10:02:00.000Z',
        completedAt: step ? null : '2026-10-06T10:02:27.000Z',
        buildTime: step ? null : 27,
        triggeredBy: sophie,
      },
      pending: [],
    }),
  );
};
const MISE_EN_LIGNE = { etat: (p: Page) => p.locator('main section').first() };
const miseEnLigne = (nom: string, step: string | null): Plan => ({
  nom,
  ou: 'admin',
  chemin: '/mise-en-ligne',
  url: 'app.communeo.fr/mise-en-ligne',
  donnees: etatMiseEnLigne(step),
  elements: MISE_EN_LIGNE,
});

// ---------------------------------------------------------------------------------------------------
// 5. Site public : commune en essai (bandeau « Site en préparation »), un mardi à 10 h

const MARDI_10H = '2026-10-06T10:00:00+02:00';

async function chercherDemarche(page: Page) {
  const champ = page.locator('[data-cn-demarches-input]');
  await champ.fill('carte d’identité');
  await champ.press('Enter');
  await page.getByText(/démarches pour/).first().waitFor();
  await page.waitForTimeout(500);
  // Le champ de recherche en haut de l'écran, les résultats dessous
  await champ.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 24));
}

export const captures: Plan[] = [
  inscription('inscription-vide'),
  inscription('inscription-suggestions', chercherCommune, { suggestion: suggestions }),
  inscription('inscription-commune', choisirCommune),
  inscription('inscription-remplie', remplirInscription),

  assistantCommune(
    'assistant-recherche',
    undefined,
    async (page) => {
      await suggestionAssistant(page).waitFor();
    },
    { suggestion: suggestionAssistant },
  ),
  assistantCommune('assistant-chargement', detailsEnAttente, async (page) => {
    await suggestionAssistant(page).click();
    await page.waitForTimeout(400);
  }),
  assistantCommune('assistant-rempli', undefined, async (page) => {
    await suggestionAssistant(page).click();
    const population = page.getByLabel(/^Population/);
    for (let i = 0; i < 50 && (await population.inputValue()) !== '3240'; i += 1) await page.waitForTimeout(100);
    await page.waitForTimeout(300);
  }),
  {
    nom: 'assistant-theme',
    ou: 'admin',
    chemin: '/assistant?etape=4',
    options: { onboarding: { step: 4 }, theme: 'moderne' },
    url: 'app.communeo.fr/assistant',
    elements: THEME,
  },
  {
    nom: 'assistant-theme-choisi',
    ou: 'admin',
    chemin: '/assistant?etape=4',
    options: { onboarding: { step: 4 }, theme: 'moderne' },
    url: 'app.communeo.fr/assistant',
    avant: async (page) => THEME.institutionnel(page).click(),
    elements: THEME,
  },

  {
    nom: 'tableau-de-bord',
    ou: 'admin',
    chemin: '/',
    url: 'app.communeo.fr',
    elements: { page: (p) => p.getByRole('link', { name: /Location de la salle des fêtes/ }).first() },
  },
  editeur('editeur', undefined, { texte: EDITEUR.texte }),
  editeur('editeur-texte', ouvrirTexte, { zone: (p) => p.locator('.ProseMirror').first() }),
  editeur('editeur-texte-tape', taperTexte, { zone: (p) => p.locator('.ProseMirror').first(), ajouter: EDITEUR.ajouter }),
  editeur('editeur-catalogue', catalogue, {
    image: (p) => p.getByRole('dialog', { name: 'Ajouter un bloc' }).getByRole('button', { name: 'Image' }),
    documents: (p) => p.getByRole('dialog', { name: 'Ajouter un bloc' }).getByRole('button', { name: 'Documents' }),
  }),
  editeur('editeur-image', ajouterImage, { image: (p) => p.getByRole('region', { name: /Contenu de la page/ }).locator('img').last() }),
  editeur('editeur-document', ajouterDocument, { document: (p) => p.getByText('reglement-salle.pdf').first() }),
  editeur('editeur-enregistre', enregistre, { enregistrement: EDITEUR.enregistrement, apercu: EDITEUR.apercu, mettreEnLigne: EDITEUR.mettreEnLigne }),
  editeur('apercu', async (page) => {
    await enregistre(page);
    await apercuPleinEcran(page);
  }),

  miseEnLigne('mise-en-ligne-verification', 'checking'),
  miseEnLigne('mise-en-ligne-pages', 'rendering'),
  miseEnLigne('mise-en-ligne-publication', 'publishing'),
  miseEnLigne('mise-en-ligne-ok', null),

  {
    nom: 'site-ordinateur',
    ou: 'site',
    theme: 'essai',
    chemin: '/',
    heure: MARDI_10H,
    pleinePage: true,
    url: 'saint-aubin.communeo.fr',
    elements: {
      ouvert: (p) => p.locator('.in-header-status'),
      actualites: (p) => p.locator('section:has(#in-news)'),
      preparation: (p) => p.locator('.cn-preparation'),
    },
  },
  {
    nom: 'site-telephone',
    ou: 'site',
    theme: 'essai',
    chemin: '/',
    appareil: 'telephone',
    heure: MARDI_10H,
    url: 'saint-aubin.communeo.fr',
    elements: { preparation: (p) => p.locator('.cn-preparation') },
  },
  {
    nom: 'site-telephone-demarches',
    ou: 'site',
    theme: 'essai',
    chemin: '/demarches',
    appareil: 'telephone',
    heure: MARDI_10H,
    url: 'saint-aubin.communeo.fr/demarches',
    avant: chercherDemarche,
  },
];
