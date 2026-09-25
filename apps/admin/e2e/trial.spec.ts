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

test('passer en live : ce qui change, demande envoyée à l’équipe', async ({ page }) => {
  const { calls } = await mockApi(page, { trial: { endsInDays: 12 } });
  await page.goto('/');
  await banner(page).getByRole('link', { name: 'Passer en live' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Passer en live' })).toBeFocused();
  await expect(page.getByRole('main').getByText("Essai gratuit : 12 jours restants, jusqu'au")).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ce qui change' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Comment ça se passe' }).getByRole('listitem')).toHaveCount(3);
  // Déjà sur l'écran : le bandeau ne répète pas le lien
  await expect(banner(page).getByRole('link', { name: 'Passer en live' })).toHaveCount(0);
  await expectNoViolations(page);

  await page.getByRole('button', { name: 'Demander le passage en live' }).click();
  await expect.poll(() => calls).toContain('POST /api/trial/live-request');
  await expect(page.getByRole('status').filter({ hasText: 'Demande envoyée le' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Demander le passage en live' })).toHaveCount(0);
  await expect(banner(page)).toContainText('Passage en live demandé le');
  await expectNoViolations(page);
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

test('rédacteur : la demande est réservée aux administrateurs', async ({ page }) => {
  await mockApi(page, { user: 'editor', trial: { endsInDays: 12 } });
  await page.goto('/passer-en-live');
  await expect(page.getByText('Seul un administrateur de la commune peut demander le passage en live.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Demander le passage en live' })).toHaveCount(0);
});

test('essai terminé : site retiré, lecture seule expliquée, demande toujours possible', async ({ page }) => {
  const { calls } = await mockApi(page, { trial: { expiredDaysAgo: 3 }, publication: 'pending' });
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
  await page.getByRole('button', { name: 'Demander le passage en live' }).click();
  await expect.poll(() => calls).toContain('POST /api/trial/live-request');
  await expect(page.getByRole('status').filter({ hasText: 'Demande envoyée le' })).toBeVisible();
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
