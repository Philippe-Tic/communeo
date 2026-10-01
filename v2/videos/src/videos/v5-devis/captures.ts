/**
 * Écrans de V5 (le devis en ligne), dans l'ordre du montage : l'écran « Passer en live » de l'admin
 * simulé (offre, saisie du devis, devis validé), puis le devis validé en PDF, produit par le code du
 * backend (services/quote-pdf.ts, pdfkit) avec les données fictives de Saint-Aubin-sur-Loire. Aucune
 * image retouchée : chaque état vient de l'interface ou des réponses de l'API simulée.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Page, Route } from '@playwright/test';
import { pricingTier, quoteAmounts, tierLabel } from '@communeo/core';
import type { Plan } from '../../lib/plans';
import { executer, RACINE } from '../../../scripts/outils';

const json = (route: Route, body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

/** Un mardi à 10 h 12, comme le site public de V1 */
const VALIDATION = '2026-10-06T10:12:00+02:00';
/** Population INSEE de Saint-Aubin-sur-Loire dans les données de démonstration (assistant de création, V1) */
const POPULATION = 3240;
/** SIRET fictif : celui de la mairie dans le mock (Annuaire), clé de Luhn corrigée pour être accepté */
export const SIRET = '215 802 365 00019';
const SIGNATAIRE = { nom: 'Claire Martin', qualite: 'Maire' };
const COMMUNE = {
  name: 'Saint-Aubin-sur-Loire',
  insee: '58236',
  address: '1 place de la Mairie, 58300 Saint-Aubin-sur-Loire',
  billingEmail: 'mairie@saint-aubin-sur-loire.fr',
};
// Les prix de packages/core/src/site/pricing.ts : la vidéo suit la grille si elle change
const TRANCHE = pricingTier(POPULATION);
const OFFRE = { population: POPULATION, tierLabel: tierLabel(TRANCHE), amounts: quoteAmounts(TRANCHE.annualHT, 0) };
const DEVIS = {
  documentId: 'q-1',
  number: 'DEV-2026-0001',
  status: 'signed' as const,
  signedAt: new Date(VALIDATION).toISOString(),
  signatoryName: SIGNATAIRE.nom,
  signatoryRole: SIGNATAIRE.qualite,
  amountHT: OFFRE.amounts.ht,
  amountTTC: OFFRE.amounts.ttc,
};

/** Offre d'après la population INSEE de la commune ; le devis, une fois validé */
async function offre(page: Page) {
  let signe = false;
  await page.route('**/api/quote', (route) => json(route, { data: { commune: { ...COMMUNE, siret: null }, offer: OFFRE, quote: signe ? DEVIS : null } }));
  await page.route('**/api/quote/sign', (route) => {
    signe = true;
    return json(route, { data: DEVIS });
  });
}

/** Le devis validé, rendu par le backend (pdfkit), émetteur non renseigné comme en développement */
async function devisPdf(page: Page) {
  // Le backend lit @communeo/core compilé
  if (!existsSync(join(RACINE, 'packages/core/dist/index.js'))) executer('pnpm', ['--filter', '@communeo/core', 'build'], RACINE);
  const { renderQuotePdf } = await import('../../../../../apps/backend/src/services/quote-pdf');
  const pdf = await renderQuotePdf(
    { name: 'Communeo', address: '', siret: '', email: '' },
    {
      number: DEVIS.number,
      date: new Date(VALIDATION),
      communeName: COMMUNE.name,
      codeInsee: COMMUNE.insee,
      siret: SIRET.replace(/\s/g, ''),
      address: COMMUNE.address,
      billingEmail: COMMUNE.billingEmail,
      population: OFFRE.population,
      tierLabel: OFFRE.tierLabel,
      amounts: OFFRE.amounts,
      // Adresse IP de documentation (RFC 5737), compte de la secrétaire de mairie du mock
      signature: { name: SIGNATAIRE.nom, role: SIGNATAIRE.qualite, at: new Date(VALIDATION), ip: '203.0.113.24', email: 'sophie.leroy@saint-aubin.fr' },
    },
  );
  await page.route('**/api/quote/q-1/pdf', (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: pdf }));
}

const champ = (page: Page, nom: RegExp) => page.getByLabel(nom);
const SIRET_CHAMP = /^SIRET de la mairie/;
const NOM_CHAMP = /^Nom du signataire/;

/** Le formulaire du devis à l'écran : la page défile jusqu'en bas, comme on le ferait */
async function formulaire(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}
async function siret(page: Page) {
  await formulaire(page);
  await champ(page, SIRET_CHAMP).fill(SIRET);
}
async function signataire(page: Page) {
  await siret(page);
  await champ(page, NOM_CHAMP).fill(SIGNATAIRE.nom);
}
async function qualite(page: Page) {
  await signataire(page);
  await page.getByRole('combobox', { name: /^Qualité/ }).selectOption(SIGNATAIRE.qualite);
}
async function coche(page: Page) {
  await qualite(page);
  await page.getByRole('checkbox', { name: /J’ai lu le devis/ }).check();
}
async function valide(page: Page) {
  await coche(page);
  await page.getByRole('button', { name: 'Valider le devis' }).click();
  await page.getByText(/Devis DEV-2026-0001 validé/).waitFor();
  // La notification de confirmation est fermée : seul l'encadré du devis validé reste
  await page.getByRole('button', { name: 'Fermer la notification' }).click();
}

const ELEMENTS: Plan['elements'] = {
  titre: (p) => p.getByRole('heading', { level: 1 }),
  offre: (p) => p.locator('section[aria-labelledby="offre"]'),
  prix: (p) => p.locator('section[aria-labelledby="offre"] p').first(),
  devis: (p) => p.locator('section[aria-labelledby="devis"]'),
  siret: (p) => champ(p, SIRET_CHAMP),
  signataire: (p) => champ(p, NOM_CHAMP),
  qualite: (p) => p.getByRole('combobox', { name: /^Qualité/ }),
  accepte: (p) => p.getByRole('checkbox', { name: /J’ai lu le devis/ }),
  valider: (p) => p.getByRole('button', { name: 'Valider le devis' }),
};

const passerEnLive = (nom: string, avant?: (page: Page) => Promise<void>, elements: Plan['elements'] = ELEMENTS): Plan => ({
  nom,
  ou: 'admin',
  chemin: '/passer-en-live',
  options: { trial: { endsInDays: 12 } },
  heure: VALIDATION,
  url: 'app.communeo.fr/passer-en-live',
  donnees: offre,
  avant,
  elements,
});

export const captures: Plan[] = [
  passerEnLive('offre'),
  passerEnLive('devis-vide', formulaire),
  passerEnLive('devis-siret', siret),
  passerEnLive('devis-signataire', signataire),
  passerEnLive('devis-qualite', qualite),
  passerEnLive('devis-coche', coche),
  passerEnLive('devis-valide', valide, {
    valide: (p) => p.getByRole('status').filter({ hasText: 'DEV-2026-0001' }),
    pdf: (p) => p.getByRole('link', { name: /Télécharger le devis/ }),
  }),
  {
    nom: 'devis-pdf',
    ou: 'admin',
    // Zoom 160 % : le texte reste net quand la caméra s'approche
    chemin: '/api/quote/q-1/pdf#navpanes=0&zoom=160',
    pdf: true,
    url: 'app.communeo.fr/api/quote/q-1/pdf',
    donnees: devisPdf,
    avant: async (page) => {
      // Une fenêtre assez haute pour toute la page A4 à 160 % : la caméra la parcourt
      await page.setViewportSize({ width: 1440, height: 1960 });
      // La visionneuse affiche le document après un court instant
      await page.waitForTimeout(2500);
    },
  },
];
