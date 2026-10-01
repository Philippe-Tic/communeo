/**
 * Écrans de V2 (une alerte, de l'administration au téléphone), dans l'ordre du montage. Chaque état est
 * obtenu par l'interface ou par des données de démonstration (réponses simulées), jamais en retouchant
 * les images. Un lundi à 16 h : la coupure d'eau a lieu le lendemain, mardi 6 octobre, de 9 h à 12 h.
 */
import type { Page, Route } from '@playwright/test';
import type { Plan } from '../../lib/plans';

const LUNDI_16H = '2026-10-05T16:00:00+02:00';

export const ALERTE = {
  titre: 'Coupure d’eau mardi de 9 h à 12 h',
  message: 'Pensez à faire des réserves d’eau.',
  /** Fin de l'affichage : mardi 6 octobre à 12 h (heure de Paris) */
  finJour: '2026-10-06',
  finHeure: '12',
};

const json = (route: Route, body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

// ---------------------------------------------------------------------------------------------------
// Administration : l'écran « Nouvelle alerte », rempli champ par champ, l'aperçu, puis la publication

const FORMULAIRE = {
  titre: (p: Page) => p.getByRole('textbox', { name: /^Titre/ }),
  attention: (p: Page) => p.locator('label', { hasText: 'Attention' }),
  message: (p: Page) => p.getByRole('textbox', { name: /^Message/ }),
  fin: (p: Page) => p.getByLabel(/^Fin/),
  heureFin: (p: Page) => p.locator('select[id$="endTime-h"]'),
  apercu: (p: Page) => p.getByRole('button', { name: /Voir l.aperçu/ }),
  carte: (p: Page) => p.locator('form > div').first(),
};

async function titre(page: Page) {
  await FORMULAIRE.titre(page).fill(ALERTE.titre);
}

async function attention(page: Page) {
  await titre(page);
  await FORMULAIRE.attention(page).click();
}

async function message(page: Page) {
  await attention(page);
  await FORMULAIRE.message(page).fill(ALERTE.message);
}

async function fin(page: Page) {
  await message(page);
  await FORMULAIRE.fin(page).fill(ALERTE.finJour);
  await FORMULAIRE.heureFin(page).selectOption(ALERTE.finHeure);
  // Aucun champ sélectionné dans l'image
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

async function apercu(page: Page) {
  await fin(page);
  await FORMULAIRE.apercu(page).click();
  await page.getByRole('heading', { name: /Aperçu de l.alerte/ }).waitFor();
}

async function publiee(page: Page) {
  await apercu(page);
  await page.getByRole('button', { name: /Publier l.alerte/ }).click();
  await page.getByText(/Alerte publiée/).first().waitFor();
}

const nouvelleAlerte = (nom: string, avant?: (page: Page) => Promise<void>, elements: Plan['elements'] = FORMULAIRE): Plan => ({
  nom,
  ou: 'admin',
  chemin: '/alertes/nouvelle',
  heure: LUNDI_16H,
  // Aucune autre alerte (la liste, après publication, ne montre que celle-ci) ; site à jour : rien
  // n'attend de mise en ligne
  options: { alertSet: 'none', publication: 'ok' },
  // Le formulaire dépasse la fenêtre : la page entière, qui défile jusqu'au bouton « Voir l'aperçu »
  pleinePage: elements === FORMULAIRE,
  url: 'app.communeo.fr/alertes/nouvelle',
  avant,
  elements,
});

// ---------------------------------------------------------------------------------------------------
// Site de la commune sur un téléphone. Le bandeau d'un site publié est rechargé par le navigateur depuis
// l'API publique (`/api/alertes/public/:site`, adresse posée sur <body> par un build Strapi) : le site
// de démonstration reçoit cette adresse, et la réponse de l'API est simulée, sans alerte puis avec
// l'alerte publiée. Le bandeau est donc dessiné par le vrai script du site.

const ENDPOINT = '/api/alertes/public/site-saint-aubin';

const alertePubliee = {
  documentId: 'al-1',
  title: ALERTE.titre,
  message: ALERTE.message,
  severity: 'warning',
  active: true,
  display_from: '2026-10-05T14:00:00.000Z',
  display_until: '2026-10-06T10:00:00.000Z',
  link_url: null,
  link_label: null,
  alert_type: 'coupure-eau',
  location: null,
  start_date: null,
  end_date: null,
  affected_area: null,
};

const siteAvecApi = (alertes: unknown[]) => async (page: Page) => {
  await page.route(
    (url) => url.pathname === '/' || url.pathname === '/index.html',
    async (route) => {
      const reponse = await route.fetch();
      const html = (await reponse.text()).replace('<body', `<body data-cn-alerts-endpoint="${ENDPOINT}"`);
      return route.fulfill({ response: reponse, body: html });
    },
  );
  await page.route(`**${ENDPOINT}`, (route) => json(route, { data: alertes }));
};

const telephone = (nom: string, alertes: unknown[]): Plan => ({
  nom,
  ou: 'site',
  chemin: '/',
  appareil: 'telephone',
  heure: LUNDI_16H,
  url: 'saint-aubin-sur-loire.fr',
  donnees: siteAvecApi(alertes),
  avant: async (page) => {
    // Le script du bandeau a lu l'API (ou constaté qu'elle n'a rien) : la page ne bouge plus
    await page.waitForFunction(() => {
      const region = document.querySelector<HTMLElement>('[data-cn-alerts]');
      return !region || region.hidden || region.querySelector('[data-cn-alert="al-1"]');
    });
  },
  elements: alertes.length ? { bandeau: (p) => p.locator('[data-cn-alerts]'), entete: (p) => p.locator('header').first() } : { entete: (p) => p.locator('header').first() },
});

export const captures: Plan[] = [
  nouvelleAlerte('alerte-vide'),
  nouvelleAlerte('alerte-titre', titre),
  nouvelleAlerte('alerte-attention', attention),
  nouvelleAlerte('alerte-message', message),
  nouvelleAlerte('alerte-fin', fin),
  nouvelleAlerte('alerte-apercu', apercu, {
    bandeau: (p) => p.getByText(/Voici le bandeau/).locator('xpath=following-sibling::*[1]'),
    publier: (p) => p.getByRole('button', { name: /Publier l.alerte/ }),
  }),
  nouvelleAlerte('alerte-publiee', publiee, {
    toast: (p) => p.getByText(/Alerte publiée/).first(),
    ligne: (p) => p.locator('main').getByText(ALERTE.titre).first(),
  }),
  // La liste, une fois la notification fermée : l'alerte en ligne et ses dates d'affichage
  nouvelleAlerte(
    'alertes-liste',
    async (page) => {
      await publiee(page);
      await page.getByRole('button', { name: 'Fermer la notification' }).click();
      await page.getByText(/Alerte publiée/).waitFor({ state: 'hidden' });
    },
    {
      titre: (p) => p.getByRole('heading', { level: 1 }),
      carte: (p) => p.locator('main').getByText(ALERTE.titre).first().locator('xpath=ancestor::*[contains(@class, "border")][1]'),
    },
  ),

  telephone('site-sans-alerte', []),
  telephone('site-avec-alerte', [alertePubliee]),
];
