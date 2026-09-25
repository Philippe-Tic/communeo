/**
 * Période d'essai (#310) : bandeau des jours restants, écran « Passer en live » et demande envoyée à
 * l'équipe ; essai terminé : site retiré, administration en lecture seule ; espace équipe : offre de
 * la commune, prolonger l'essai, passer en live.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const banner = (page: Page) => page.getByRole('region', { name: "Période d'essai" });

test('essai en cours : jours restants, rien ne change pour le reste de l’administration', async ({ page }) => {
  await mockApi(page, { trial: { endsInDays: 23 } });
  await page.goto('/');
  await expect(banner(page)).toContainText('Essai gratuit : 23 jours restants');
  await expect(banner(page).getByRole('link', { name: 'Passer en live' })).toHaveAttribute('href', '/passer-en-live');
  await expectNoViolations(page);
});

test('dernière semaine : bandeau d’avertissement ; dernier jour', async ({ page }) => {
  await mockApi(page, { trial: { endsInDays: 1 } });
  await page.goto('/');
  await expect(banner(page)).toContainText('Essai gratuit : dernier jour');
  await expectNoViolations(page);
});

test('commune en live : aucun bandeau', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
});

test('passer en live : l’offre, puis le devis validé en ligne', async ({ page }) => {
  const { bodies } = await mockApi(page, { trial: { endsInDays: 12 } });
  await page.goto('/');
  await banner(page).getByRole('link', { name: 'Passer en live' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Passer en live' })).toBeFocused();
  await expect(page.getByRole('main').getByText("Essai gratuit : 12 jours restants, jusqu'au")).toBeVisible();
  const offer = page.getByRole('region', { name: "L'offre" });
  await expect(offer).toContainText('390,00 € HT par an');
  await expect(offer).toContainText('Tranche : de 500 à 1 999 habitants (population INSEE : 1 234). Sans frais de mise en service.');
  // Déjà sur l'écran : le bandeau ne répète pas le lien
  await expect(banner(page).getByRole('link', { name: 'Passer en live' })).toHaveCount(0);
  await expectNoViolations(page);

  const quote = page.getByRole('region', { name: 'Devis et bon de commande' });
  await expect(quote.getByRole('textbox', { name: /^Adresse de la mairie/ })).toHaveValue('1 place de la Mairie, 58300 Saint-Aubin-sur-Loire');
  await quote.getByRole('button', { name: 'Valider le devis' }).click();
  const summary = page.getByRole('alert').filter({ hasText: 'la validation du devis' });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText('Indiquez le SIRET de la mairie');
  await expect(summary).toContainText('Cochez la case pour valider le devis');
  await expectNoViolations(page);

  await quote.getByRole('textbox', { name: /^SIRET/ }).fill('217 500 016 00019');
  await quote.getByRole('textbox', { name: /^Nom du signataire/ }).fill('Sophie Leroy');
  await quote.getByRole('combobox', { name: /^Qualité/ }).selectOption('Maire');
  await quote.getByRole('checkbox', { name: /je le valide au nom de la commune/ }).check();
  // Le projet de devis reprend la saisie en cours
  await expect(quote.getByRole('link', { name: /Voir le devis \(PDF\)/ })).toHaveAttribute('href', /^\/api\/quote\/draft\?siret=217\+500\+016\+00019&address=/);
  await quote.getByRole('button', { name: 'Valider le devis' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Devis DEV-2026-0001 validé le' })).toBeVisible();
  expect(bodies.find((entry) => entry.call === 'sign quote')?.body.data).toMatchObject({
    siret: '21750001600019',
    signatoryName: 'Sophie Leroy',
    signatoryRole: 'Maire',
    billingEmail: 'mairie@saint-aubin-sur-loire.fr',
    accept: true,
  });
  await expect(page.getByRole('link', { name: /Télécharger le devis \(PDF\)/ })).toHaveAttribute('href', '/api/quote/q-1/pdf');
  await expect(banner(page)).toContainText('Passage en live demandé le');
  await expectNoViolations(page);
});

test('devis : une autre qualité se précise', async ({ page }) => {
  await mockApi(page, { trial: { endsInDays: 12 } });
  await page.goto('/passer-en-live');
  const quote = page.getByRole('region', { name: 'Devis et bon de commande' });
  await expect(quote.getByRole('textbox', { name: /^Qualité du signataire/ })).toHaveCount(0);
  await quote.getByRole('combobox', { name: /^Qualité/ }).selectOption('autre');
  await expect(quote.getByRole('textbox', { name: /^Qualité du signataire/ })).toBeVisible();
});

test('pendant l’essai, le domaine personnalisé vient avec le passage en live', async ({ page }) => {
  await mockApi(page, { trial: { endsInDays: 12 } });
  await page.goto('/mise-en-ligne');
  const domain = page.getByRole('region', { name: 'Domaine personnalisé' });
  await expect(domain).toContainText("Pendant l'essai, le site garde son adresse Communeo.");
  await expect(domain.getByRole('textbox')).toHaveCount(0);
  await domain.getByRole('link', { name: 'Passer en live' }).click();
  await expect(page.getByRole('region', { name: 'Ce qui change' })).toContainText("Vous pouvez le relier à l'adresse de la commune");
  await expectNoViolations(page);
});

test('rédacteur : l’offre, mais le devis est réservé aux administrateurs', async ({ page }) => {
  await mockApi(page, { user: 'editor', trial: { endsInDays: 12 } });
  await page.goto('/passer-en-live');
  await expect(page.getByRole('region', { name: "L'offre" })).toContainText('390,00 € HT par an');
  await expect(page.getByText('Seul un administrateur de la commune peut valider le devis.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Valider le devis' })).toHaveCount(0);
});

test('essai terminé : site retiré, lecture seule expliquée, devis toujours possible', async ({ page }) => {
  await mockApi(page, { trial: { expiredDaysAgo: 3 }, publication: 'pending' });
  await page.goto('/');
  await expect(banner(page)).toContainText("Votre essai est terminé. Le site n'est plus en ligne et l'administration est en lecture seule.");
  await expect(banner(page)).toContainText("Vos contenus sont conservés jusqu'au");
  // Plus de « Mettre en ligne » dans l'en-tête (dans le menu sur mobile)
  await expect(page.getByText('Site retiré : essai terminé').first()).toBeAttached();
  await expect(page.getByRole('button', { name: 'Mettre en ligne' })).toHaveCount(0);
  // Tableau de bord : la carte de mise en ligne ne parle plus de modifications en attente
  await expect(page.getByText('Modifications en attente', { exact: true })).toHaveCount(0);
  await expectNoViolations(page);

  await page.goto('/mise-en-ligne');
  await expect(page.getByRole('heading', { name: 'Site retiré : votre essai est terminé' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Domaine personnalisé' })).toHaveCount(0);
  await expectNoViolations(page);

  // Une écriture est refusée par le serveur, avec son explication
  await page.goto('/mon-site/informations');
  await page.getByRole('textbox', { name: /Population/ }).fill('3300');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText(/période d'essai est terminée/).first()).toBeVisible();

  await page.goto('/passer-en-live');
  await expect(page.getByRole('region', { name: 'Ce qui change' })).toContainText('Le site est remis en ligne dès le passage en live.');
  await expect(page.getByRole('button', { name: 'Valider le devis' })).toBeVisible();
});

test('espace équipe : offre dans la liste et sur la fiche ; prolonger l’essai ; passer en live', async ({ page }) => {
  const { bodies } = await mockApi(page, { user: 'super_admin', trial: { expiredDaysAgo: 3, requested: true } });
  await page.goto('/plateforme');
  const list = page.getByRole('region', { name: 'Liste des communes' });
  await expect(list.getByText('Live demandé').locator('visible=true')).toBeVisible();

  await page.goto('/plateforme/communes/site-saint-aubin');
  const offer = page.getByRole('region', { name: 'Offre' });
  await expect(offer).toContainText('Essai terminé le');
  await expect(offer).toContainText('Passage en live demandé le');
  await expect(offer).toContainText('Données supprimées le');
  await expectNoViolations(page);

  await page.getByRole('button', { name: "Prolonger l'essai…" }).click();
  const extend = page.getByRole('alertdialog', { name: "Prolonger l'essai de Saint-Aubin-sur-Loire ?" });
  await expect(extend).toContainText("L'essai reprend à partir d'aujourd'hui");
  await extend.getByRole('radio', { name: '30 jours' }).check();
  await expectNoViolations(page);
  await extend.getByRole('button', { name: "Prolonger l'essai" }).click();
  await expect(extend).toBeHidden();
  expect(bodies.at(-1)).toMatchObject({ call: 'PUT commune site-saint-aubin', body: { data: { extendTrialDays: 30 } } });
  await expect(offer).toContainText("Essai jusqu'au");
  await expect(offer).toContainText('30 jours restants');

  await page.getByRole('button', { name: 'Passer en live…' }).click();
  const live = page.getByRole('alertdialog', { name: 'Passer Saint-Aubin-sur-Loire en live ?' });
  await live.getByRole('button', { name: 'Passer en live' }).click();
  await expect(live).toBeHidden();
  expect(bodies.at(-1)).toMatchObject({ body: { data: { plan: 'live' } } });
  await expect(offer).toContainText('Live');
  await expect(page.getByRole('button', { name: 'Passer en live…' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: "Prolonger l'essai…" })).toHaveCount(0);
});
