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

test('votre thème : la commune dans chaque vignette, thèmes à venir non sélectionnables, aperçu, choix', async ({
  page,
}) => {
  // Commune créée avec un thème pas encore construit : Institutionnel proposé, enregistré en continuant
  const { bodies } = await mockApi(page, { onboarding: { step: 4 }, theme: 'moderne' });
  await page.goto('/assistant?etape=4');
  await expect(page.getByRole('heading', { level: 1, name: 'Votre thème' })).toBeVisible();
  const themes = page.getByRole('group', { name: 'Thème du site' });
  await expect(themes.getByRole('listitem')).toHaveCount(4);
  await expect(themes.getByRole('listitem').first()).toContainText('Saint-Aubin-sur-Loire');
  await expect(themes.getByRole('radio', { name: 'Institutionnel' })).toBeChecked();
  for (const name of ['Moderne', 'Journal', 'Bourg'])
    await expect(themes.getByRole('radio', { name: new RegExp(`^${name}`) })).toBeDisabled();
  await expectNoViolations(page);

  await themes.getByRole('button', { name: 'Aperçu de votre site dans le thème Institutionnel' }).click();
  const preview = page.getByRole('dialog', { name: /Aperçu de votre site dans le thème Institutionnel/ });
  await expect(preview.getByTitle(/Votre site dans le thème Institutionnel/)).toHaveAttribute(
    'src',
    /theme=institutionnel/,
  );
  await preview.getByRole('button', { name: 'Choisir le thème Institutionnel' }).click();
  await expect(preview).toBeHidden();

  await page.getByRole('button', { name: 'Continuer avec Institutionnel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vos obligations légales' })).toBeVisible();
  expect(lastSitePut(bodies)).toMatchObject({ theme: 'institutionnel', onboarding: { step: 5 } });
});

test('votre thème déjà choisi : rien à changer, on continue', async ({ page }) => {
  const { bodies } = await mockApi(page, { onboarding: { step: 4 } });
  await page.goto('/assistant?etape=4');
  await page.getByRole('button', { name: 'Continuer avec Institutionnel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vos obligations légales' })).toBeVisible();
  expect(lastSitePut(bodies)).not.toHaveProperty('theme');
});

test('obligations : textes pré-remplis à relire, informations manquantes demandées', async ({ page }) => {
  const { bodies } = await mockApi(page, { onboarding: { step: 5 }, legalMissing: true });
  await page.goto('/assistant?etape=5');
  await expect(page.getByRole('heading', { level: 1, name: 'Vos obligations légales' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Mentions légales' })).toContainText('2 informations manquantes');
  await expect(page.getByRole('region', { name: 'Accessibilité' })).toContainText('niveau « partiellement conforme »');
  await expectNoViolations(page);

  // Relire la politique : pré-remplie au nom de la commune, modifiable
  await page.getByRole('button', { name: 'Relire : Politique de données personnelles' }).click();
  const review = page.getByRole('dialog', { name: 'Politique de données personnelles' });
  await expect(review).toContainText('La mairie de Saint-Aubin-sur-Loire collecte des données personnelles');
  await review.getByRole('button', { name: 'Terminer la relecture' }).click();

  // Continuer sans SIRET ni directeur : demandés ; « Compléter plus tard » passe
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^SIRET de la mairie/ })).toBeFocused();
  await page.getByRole('textbox', { name: /^SIRET de la mairie/ }).fill('21580236500017');
  await page.getByRole('textbox', { name: /^Directeur de publication/ }).fill('Claire Martin');
  await expect(page.getByRole('region', { name: 'Mentions légales' })).toContainText('Complètes');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Premières pages' })).toBeVisible();
  const saved = lastSitePut(bodies)!;
  expect(saved).toMatchObject({
    mentions_legales: { siret: '21580236500017', publication_director: 'Claire Martin' },
    accessibilite: { accessibility_level: 'partiellement-conforme' },
    onboarding: { step: 6 },
  });
  expect(JSON.stringify((saved.rgpd as { rgpd_policy: unknown }).rgpd_policy)).toContain('Base légale');
  expect(
    JSON.stringify((saved.accessibilite as { accessibility_declaration: unknown }).accessibility_declaration),
  ).toContain('Établissement de cette déclaration');
});

test('obligations : compléter plus tard enregistre ce qui est là et passe à la suite', async ({ page }) => {
  const { bodies } = await mockApi(page, { onboarding: { step: 5 }, legalMissing: true });
  await page.goto('/assistant?etape=5');
  await page.getByRole('button', { name: 'Compléter plus tard' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Premières pages' })).toBeVisible();
  expect(lastSitePut(bodies)).toMatchObject({ mentions_legales: { siret: null }, onboarding: { step: 6 } });
});

test('logo passé, étapes suivantes, terminer : assistant fini, tableau de bord', async ({ page }) => {
  const { bodies } = await mockApi(page, { onboarding: { step: 3 } });
  await page.goto('/assistant?etape=3');
  await expect(page.getByRole('figure').first()).toContainText('Saint-Aubin-sur-Loire');
  await page.getByRole('button', { name: 'Passer cette étape' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Votre thème' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer avec Institutionnel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vos obligations légales' })).toBeVisible();
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
