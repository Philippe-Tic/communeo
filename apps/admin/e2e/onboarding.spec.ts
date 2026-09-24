/**
 * Assistant de création (#150, handoff 6.18) : proposé à l'administrateur d'une commune créée par
 * l'équipe ; bienvenue, votre commune (recherche, pré-remplissage avec la source de chaque valeur,
 * saisie à la main si les données publiques ne répondent pas), votre logo ; « Enregistrer et
 * continuer plus tard » ; étapes suivantes en attente de leurs tickets.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const lastSitePut = (bodies: Array<{ call: string; body: { data: Record<string, unknown> } }>) =>
  bodies.filter((entry) => entry.call === 'PUT site').at(-1)?.body.data;

async function chooseCommune(page: Page) {
  const search = page.getByRole('searchbox', { name: /Rechercher la commune/ });
  await expect(search).toHaveValue('Saint-Aubin-sur-Loire');
  // Commune déjà connue (code INSEE enregistré) : la recherche part quand on tape
  await search.fill('Saint-Aubin');
  await page
    .getByRole('list', { name: 'Communes trouvées' })
    .getByRole('button', { name: /Saint-Aubin-sur-Loire \(58300\)/ })
    .click();
}

test('commune nouvelle : l’administrateur arrive sur l’assistant ; bienvenue, sans violation', async ({ page }) => {
  await mockApi(page, { onboarding: { step: 1 } });
  await page.goto('/');
  await expect(page).toHaveURL(/\/assistant\?etape=1$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Créons le site de Saint-Aubin-sur-Loire' })).toBeVisible();
  await expect(page.getByText('Étape 1 sur 7')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Étapes de la création du site' }).getByRole('listitem')).toHaveCount(7);
  await expect(page.getByText('Le numéro SIRET de la mairie')).toBeVisible();
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Commencer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Votre commune' })).toBeFocused();
});

test('votre commune : pré-remplie depuis les données publiques, sources affichées, enregistrée', async ({ page }) => {
  const { bodies } = await mockApi(page, { onboarding: { step: 2 } });
  await page.goto('/assistant?etape=2');
  await chooseCommune(page);
  await expect(page.getByText('Informations trouvées. Vérifiez-les et corrigez si besoin.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Population/ })).toHaveValue('3240');
  await expect(page.getByRole('textbox', { name: /^Adresse de la mairie/ })).toHaveValue(
    '1 place de la Mairie, 58300 Saint-Aubin-sur-Loire',
  );
  await expect(page.getByText('Source : Annuaire du service public').first()).toBeAttached();
  // E-mail absent de l'annuaire : celui déjà connu est gardé, à vérifier
  await expect(page.getByText("Non trouvé dans l'annuaire : vérifiez celui-ci.")).toBeVisible();
  await expect(page.getByText(/Lun–Mar : 9h–12h · Jeu–Ven : 9h–12h/)).toBeVisible();
  await expectNoViolations(page);

  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Votre logo' })).toBeVisible();
  expect(lastSitePut(bodies)).toMatchObject({
    code_insee: '58236',
    address: '1 place de la Mairie, 58300 Saint-Aubin-sur-Loire',
    contact_phone: '03 86 00 00 00',
    infos_pratiques: { population: 3240, latitude: 46.7412, longitude: 3.7891 },
    onboarding: { step: 3 },
  });
});

test('données publiques en panne : on saisit à la main', async ({ page }) => {
  await mockApi(page, { onboarding: { step: 2 }, publicData: 'down' });
  await page.goto('/assistant?etape=2');
  await page.getByRole('searchbox', { name: /Rechercher la commune/ }).fill('Saint-Aubin');
  await expect(
    page.getByText('Les données publiques ne répondent pas : renseignez les informations à la main.'),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Adresse de la mairie/ })).toBeEditable();
});

test('enregistrer et continuer plus tard : tableau de bord avec « Reprendre », sans redirection', async ({ page }) => {
  const { bodies } = await mockApi(page, { onboarding: { step: 2 } });
  await page.goto('/assistant?etape=2');
  await page.getByRole('button', { name: 'Enregistrer et continuer plus tard' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Bonjour/ })).toBeVisible();
  expect(lastSitePut(bodies)?.onboarding).toMatchObject({ step: 2, postponedAt: expect.any(String) });
  const resume = page.getByRole('region', { name: 'Terminez la création de votre site' });
  await expect(resume).toContainText("Vous en êtes à l'étape 2 sur 7 : votre commune.");
  await resume.getByRole('link', { name: 'Reprendre' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Votre commune' })).toBeVisible();
});

test('logo passé, étapes suivantes, terminer : assistant fini, tableau de bord', async ({ page }) => {
  const { bodies } = await mockApi(page, { onboarding: { step: 3 } });
  await page.goto('/assistant?etape=3');
  await expect(page.getByRole('figure').first()).toContainText('Saint-Aubin-sur-Loire');
  await page.getByRole('button', { name: 'Passer cette étape' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Votre thème' })).toBeVisible();
  await page.goto('/assistant?etape=7');
  await page.getByRole('button', { name: 'Terminer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /^Bonjour/ })).toBeVisible();
  expect(lastSitePut(bodies)?.onboarding).toMatchObject({ completedAt: expect.any(String) });
  await expect(page.getByRole('region', { name: 'Terminez la création de votre site' })).toHaveCount(0);
});

test('éditeur : pas d’assistant', async ({ page }) => {
  await mockApi(page, { user: 'editor', onboarding: { step: 1 } });
  await page.goto('/assistant');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /^Bonjour/ })).toBeVisible();
});
