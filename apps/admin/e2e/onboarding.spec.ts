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
  const { bodies } = await mockApi(page, { onboarding: { step: 4 }, theme: 'bourg' });
  await page.goto('/assistant?etape=4');
  await expect(page.getByRole('heading', { level: 1, name: 'Votre thème' })).toBeVisible();
  const themes = page.getByRole('group', { name: 'Thème du site' });
  await expect(themes.getByRole('listitem')).toHaveCount(4);
  await expect(themes.getByRole('listitem').first()).toContainText('Saint-Aubin-sur-Loire');
  await expect(themes.getByRole('radio', { name: 'Institutionnel' })).toBeChecked();
  await expect(themes.getByRole('radio', { name: /^Moderne/ })).toBeEnabled();
  await expect(themes.getByRole('radio', { name: /^Journal/ })).toBeEnabled();
  await expect(themes.getByRole('radio', { name: /^Bourg/ })).toBeDisabled();
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

test('premières pages : quatre modèles proposés, créés en brouillon et ajoutés au menu', async ({ page }) => {
  const { bodies } = await mockApi(page, { onboarding: { step: 6 } });
  await page.goto('/assistant?etape=6');
  await expect(page.getByRole('heading', { level: 1, name: 'Vos premières pages' })).toBeVisible();
  const templates = page.getByRole('group', { name: 'Modèles de pages' });
  await expect(templates.getByRole('checkbox')).toHaveCount(5);
  await expect(templates.getByRole('checkbox', { name: /Contacter les services/ })).not.toBeChecked();
  await expectNoViolations(page);
  await templates.getByRole('checkbox', { name: /Urbanisme/ }).uncheck();
  await page.getByRole('button', { name: 'Créer 3 pages et continuer' }).click();
  await expect(page.getByRole('status').filter({ hasText: '3 pages créées en brouillon' })).toBeVisible();
  await expect(page.getByText('Étape 7 sur 7')).toBeVisible();
  expect(bodies.find((entry) => entry.call === 'POST page-templates')?.body.data).toEqual({
    templates: ['salle-des-fetes', 'etat-civil', 'inscriptions-scolaires'],
    menu: true,
  });
  // Retour sur l'étape : les pages créées sont signalées, pas recréées
  await page.goto('/assistant?etape=6');
  await expect(templates.getByRole('checkbox', { name: /Location de la salle des fêtes/ })).toBeDisabled();
  await expect(templates).toContainText('Déjà créée');
  await expect(page.getByRole('button', { name: 'Créer 1 page et continuer' })).toBeVisible();
});

test('liste des pages : « Depuis un modèle » crée la page et l’ouvre dans l’éditeur', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/pages');
  await page.getByRole('button', { name: 'Depuis un modèle' }).click();
  const dialog = page.getByRole('dialog', { name: 'Créer une page depuis un modèle' });
  await expect(dialog.getByRole('listitem')).toHaveCount(5);
  await expectNoViolations(page);
  await dialog.getByRole('button', { name: 'Créer la page « État civil »' }).click();
  await expect(page).toHaveURL(/\/pages\/p-modele-etat-civil$/);
  expect(bodies.find((entry) => entry.call === 'POST page-templates')?.body.data).toEqual({
    templates: ['etat-civil'],
    menu: false,
  });
});

test('logo passé, thème, obligations : l’assistant avance étape par étape', async ({ page }) => {
  await mockApi(page, { onboarding: { step: 3 } });
  await page.goto('/assistant?etape=3');
  await expect(page.getByRole('figure').first()).toContainText('Saint-Aubin-sur-Loire');
  await page.getByRole('button', { name: 'Passer cette étape' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Votre thème' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer avec Institutionnel' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Vos obligations légales' })).toBeVisible();
});

test('mise en ligne : récapitulatif, suivi, succès ; l’assistant est terminé, la checklist prend le relais', async ({
  page,
}) => {
  const { bodies, calls } = await mockApi(page, {
    onboarding: { step: 7 },
    legalMissing: true,
    deployOutcome: 'ok',
    publication: 'idle',
  });
  await page.goto('/assistant?etape=7');
  await expect(page.getByRole('heading', { level: 1, name: 'Mise en ligne' })).toBeVisible();
  const recap = page.locator('dl');
  await expect(recap).toContainText('Institutionnel');
  await expect(recap).toContainText('2 informations à compléter');
  await expect(recap).toContainText('saint-aubin-sur-loire.fr');
  await expectNoViolations(page);
  await page.getByRole('button', { name: 'Mettre le site en ligne' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Le site de Saint-Aubin-sur-Loire est en ligne' }),
  ).toBeFocused();
  await expect(page.getByText('Mise en ligne réussie en 27 secondes.')).toBeVisible();
  expect(calls).toContain('POST /api/deployment/trigger');
  expect(lastSitePut(bodies)?.onboarding).toMatchObject({ completedAt: expect.any(String) });
  const finish = page.getByRole('region', { name: /Pour finir votre site/ });
  await expect(finish.getByRole('listitem').first()).toHaveText(
    'Compléter les mentions légales (SIRET, directeur de publication)',
  );
  await expectNoViolations(page);

  await page.getByRole('link', { name: 'Aller au tableau de bord' }).click();
  const checklist = page.getByRole('region', { name: /Pour terminer votre site/ });
  await expect(checklist).toBeVisible();
  await expect(checklist.getByRole('link', { name: /Mentions légales/ })).toHaveAttribute('href', '/mon-site/legal');
  await expect(page.getByRole('region', { name: 'Terminez la création de votre site' })).toHaveCount(0);
});

test('mise en ligne en échec : message avec la référence, « Réessayer »', async ({ page }) => {
  await mockApi(page, { onboarding: { step: 7 }, deployOutcome: 'failed', publication: 'idle' });
  await page.goto('/assistant?etape=7');
  await page.getByRole('button', { name: 'Mettre le site en ligne' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'La mise en ligne a échoué' })).toContainText(
    'La mise en ligne a échoué (référence MEL-2026-0924-1802)',
  );
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeEnabled();
});

test('checklist du tableau de bord : un rédacteur voit ce qui reste, « Masquer » la retire pour la commune', async ({
  page,
}) => {
  const { calls } = await mockApi(page, {
    user: 'editor',
    onboarding: { step: 7, completedAt: '2026-09-24T10:00:00.000Z' },
    legalMissing: true,
  });
  await page.goto('/');
  const checklist = page.getByRole('region', { name: /Pour terminer votre site/ }).filter({ visible: true });
  await expect(checklist).toContainText(
    'Compléter les mentions légales (SIRET, directeur de publication) · par un administrateur',
  );
  await expect(checklist.getByRole('link', { name: /Mentions légales/ })).toHaveCount(0);
  await expectNoViolations(page);
  await checklist.getByRole('button', { name: 'Masquer la checklist' }).click();
  await expect(page.getByRole('region', { name: /Pour terminer votre site/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  expect(calls).toContain('POST checklist/hide');
});

test('aide contextuelle : une phrase sous le titre de l’écran', async ({ page }) => {
  await mockApi(page);
  await page.goto('/alertes');
  await expect(
    page.getByText("Une alerte publiée s'affiche en bandeau sur le site en moins d'une minute"),
  ).toBeVisible();
  await page.goto('/mon-site/legal');
  await expect(page.getByText('Les pages Mentions légales et Données personnelles du site')).toBeVisible();
});

test('éditeur : pas d’assistant', async ({ page }) => {
  await mockApi(page, { user: 'editor', onboarding: { step: 1 } });
  await page.goto('/assistant');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /^Bonjour/ })).toBeVisible();
});
