/**
 * Page d'accueil en intentions (#143, handoff 6.8) : une ligne par section (interrupteur, résumé,
 * formulaire déplié en place), enregistrement automatique, preview qui montre la section ouverte,
 * champs incomplets signalés avant tout envoi.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

type Bodies = Array<{ call: string; body: { data: Record<string, unknown> } }>;
type Home = Record<string, Record<string, unknown>>;

/** Dernier accueil envoyé, après le délai de l'enregistrement automatique */
const lastHome = (page: Page, bodies: Bodies) => async () => {
  await page.clock.fastForward(5500);
  return bodies.filter((entry) => entry.call === 'PUT site').at(-1)?.body.data.homepage as Home | undefined;
};
const row = (page: Page, name: string) =>
  page
    .getByRole('list', { name: "Sections de l'accueil" })
    .getByRole('listitem')
    .filter({ has: page.getByRole('switch', { name: `Afficher « ${name} » sur l'accueil` }) });

test('sections : résumés, compteur, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mon-site/accueil');
  await expect(page.getByRole('heading', { level: 1, name: "Page d'accueil" })).toBeVisible();
  await expect(page.getByText('7 sections affichées sur 15 disponibles')).toBeVisible();
  await expect(page.getByText(/L’ordre et la mise en page sont décidés par le thème Institutionnel/)).toBeVisible();
  await expect(page.getByRole('list', { name: "Sections de l'accueil" }).getByRole('listitem')).toHaveCount(15);
  await expect(row(page, 'Accroche')).toContainText('« Bienvenue à Saint-Aubin-sur-Loire »');
  await expect(row(page, 'Accès rapides')).toContainText('2 liens');
  await expect(row(page, 'Agenda')).toContainText('4 prochains événements');
  await expect(row(page, 'Newsletter')).toContainText('Masquée');
  // Coordonnées GPS renseignées (Informations de la commune) : la météo peut s'afficher
  await expect(row(page, 'Météo')).toContainText('Masquée');
  // Pas de poignée de déplacement : le thème décide de l'ordre
  await expect(page.getByRole('button', { name: /Déplacer/ })).toHaveCount(0);
  await expectNoViolations(page);
});

test('activer une section : enregistré automatiquement, compteur à jour', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.clock.install();
  await page.goto('/mon-site/accueil');
  await page.getByRole('switch', { name: "Afficher « Newsletter » sur l'accueil" }).click();
  await expect(page.getByText('8 sections affichées sur 15 disponibles')).toBeVisible();
  await expect(row(page, 'Newsletter')).toContainText('Invitation à s’inscrire');
  const home = lastHome(page, bodies);
  await expect.poll(async () => (await home())?.newsletter).toEqual({ enabled: true });
  const sent = (await home())!;
  // Tout l'accueil part : les réglages des autres sections sont conservés
  expect(sent.hero).toMatchObject({
    enabled: true,
    title: 'Bienvenue à Saint-Aubin-sur-Loire',
    primary_url: '/demarches',
    image: null,
  });
  expect(sent.quick_links).toMatchObject({
    enabled: true,
    items: [{ label: 'État civil', icon: 'identity' }, { label: 'Déchets' }],
  });
  await expect(page.getByText(/^Enregistré/)).toBeVisible();
});

test('accroche : dépliée en place, preview sur la section, bouton incomplet signalé puis enregistré', async ({
  page,
}) => {
  const { bodies } = await mockApi(page);
  await page.clock.install();
  await page.goto('/mon-site/accueil');
  const toggle = row(page, 'Accroche').getByRole('button', { expanded: false });
  await toggle.click();
  await expect(row(page, 'Accroche').getByRole('button', { expanded: true })).toBeVisible();
  const panel = page.getByRole('group', { name: 'Réglages : Accroche' });
  await expect(panel.getByRole('textbox', { name: /^Titre/ })).toHaveValue('Bienvenue à Saint-Aubin-sur-Loire');
  await expect(panel.getByRole('combobox', { name: 'Page du bouton' }).first()).toHaveValue('section:demarches');
  if ((page.viewportSize()?.width ?? 0) >= 1200) {
    await expect(page.getByRole('complementary', { name: "Aperçu de l'accueil" }).locator('iframe')).toHaveAttribute(
      'src',
      /section=hero/,
    );
  }
  await expectNoViolations(page);

  await panel.getByRole('textbox', { name: /^Titre/ }).fill('Saint-Aubin, au fil de la Loire');
  // Bouton secondaire : un texte sans page
  await panel
    .getByRole('group', { name: 'Bouton secondaire' })
    .getByRole('textbox', { name: /Texte du bouton/ })
    .fill('Contacter la mairie');
  await page.clock.fastForward(5500);
  await expect(page.getByText('Accueil non enregistré')).toContainText('des champs sont à compléter');
  await expect(row(page, 'Accroche')).toContainText('1 erreur');
  expect(bodies.filter((entry) => entry.call === 'PUT site')).toHaveLength(0);
  await panel
    .getByRole('group', { name: 'Bouton secondaire' })
    .getByRole('combobox', { name: 'Page du bouton' })
    .selectOption({ label: 'Contact' });
  await expect(row(page, 'Accroche')).not.toContainText('erreur');

  const home = lastHome(page, bodies);
  await expect
    .poll(async () => (await home())?.hero)
    .toMatchObject({
      title: 'Saint-Aubin, au fil de la Loire',
      secondary_label: 'Contacter la mairie',
      secondary_url: '/contact',
    });
  await expect(row(page, 'Accroche')).toContainText('« Saint-Aubin, au fil de la Loire »');
});

test('accès rapides : ajouter, choisir la page et l’icône, ordonner, retirer', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.clock.install();
  await page.goto('/mon-site/accueil');
  await row(page, 'Accès rapides').getByRole('button', { expanded: false }).click();
  const panel = page.getByRole('group', { name: 'Réglages : Accès rapides' });
  await expect(panel.getByRole('combobox', { name: 'Page' }).first()).toHaveValue(/^page:/);
  await expect(panel.getByText('2 sur 8 au maximum · 4 au moins pour une rangée complète')).toBeVisible();

  await panel.getByRole('button', { name: 'Ajouter un accès rapide' }).click();
  await expect(panel.getByRole('textbox', { name: /^Libellé/ }).nth(2)).toBeFocused();
  await panel
    .getByRole('textbox', { name: /^Libellé/ })
    .nth(2)
    .fill('Écoles');
  await panel.getByRole('combobox', { name: 'Page' }).nth(2).selectOption({ label: 'Autre adresse…' });
  await panel.getByRole('textbox', { name: 'Page : adresse' }).fill('https://ecoles.saint-aubin.fr');
  await panel.getByRole('combobox', { name: 'Icône' }).nth(2).selectOption({ label: 'Culture' });
  await panel.getByRole('button', { name: 'Monter Accès 3 « Écoles »' }).click();
  await expect(panel.getByRole('button', { name: 'Monter Accès 2 « Écoles »' })).toBeFocused();
  await panel.getByRole('button', { name: 'Retirer Accès 1 « État civil »' }).click();
  await expect(panel.getByRole('button', { name: 'Ajouter un accès rapide' })).toBeFocused();

  const home = lastHome(page, bodies);
  await expect
    .poll(async () => (await home())?.quick_links)
    .toEqual({
      enabled: true,
      items: [
        { label: 'Écoles', url: 'https://ecoles.saint-aubin.fr', description: null, icon: 'book' },
        { label: 'Déchets', url: '/collecte-des-dechets', description: 'Jours de collecte', icon: 'document' },
      ],
    });
});

test('chiffres clés : trois chiffres ajoutés, résumé et envoi', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.clock.install();
  await page.goto('/mon-site/accueil');
  await row(page, 'Chiffres clés').getByRole('switch').click();
  await row(page, 'Chiffres clés').getByRole('button', { expanded: false }).click();
  const figures = page.getByRole('group', { name: 'Réglages : Chiffres clés' });
  for (const [value, label] of [
    ['3 240', 'habitants'],
    ['42', 'associations'],
    ['2', 'écoles'],
  ] as const) {
    await figures.getByRole('button', { name: 'Ajouter un chiffre' }).click();
    await figures
      .getByRole('textbox', { name: /^Chiffre/ })
      .last()
      .fill(value);
    await figures
      .getByRole('textbox', { name: /^Ce qu'il compte/ })
      .last()
      .fill(label);
  }
  await expect(row(page, 'Chiffres clés')).toContainText('3 chiffres : habitants, associations, écoles');

  const home = lastHome(page, bodies);
  await expect
    .poll(async () => (await home())?.key_figures)
    .toEqual({
      enabled: true,
      items: [
        { value: '3 240', label: 'habitants', icon: null },
        { value: '42', label: 'associations', icon: null },
        { value: '2', label: 'écoles', icon: null },
      ],
    });
});

test('quitter l’écran : l’accueil est enregistré avant de partir', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) < 768, 'navigation dans le tiroir sur mobile');
  const { bodies } = await mockApi(page);
  await page.goto('/mon-site/accueil');
  await row(page, 'Agenda').getByRole('button', { expanded: false }).click();
  await page.getByRole('combobox', { name: 'Nombre d’événements affichés' }).selectOption('2');
  await page.getByRole('link', { name: 'Tableau de bord' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  const home = bodies.filter((entry) => entry.call === 'PUT site').at(-1)?.body.data.homepage as Home;
  expect(home.agenda).toEqual({ enabled: true, count: 2 });
});

test('enregistrement automatique pendant la saisie : rien n’est perdu', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.clock.install();
  await page.goto('/mon-site/accueil');
  await row(page, 'Chiffres clés').getByRole('switch').click();
  await row(page, 'Chiffres clés').getByRole('button', { expanded: false }).click();
  const figures = page.getByRole('group', { name: 'Réglages : Chiffres clés' });
  await figures.getByRole('button', { name: 'Ajouter un chiffre' }).click();
  await figures.getByRole('textbox', { name: /^Chiffre/ }).fill('3 240');
  await figures.getByRole('textbox', { name: /^Ce qu'il compte/ }).fill('habitants');
  // Enregistré (et l'accueil rechargé) pendant qu'on continue d'ajouter des chiffres
  await page.clock.fastForward(5500);
  await expect.poll(() => bodies.filter((entry) => entry.call === 'PUT site').length).toBeGreaterThan(0);
  await figures.getByRole('button', { name: 'Ajouter un chiffre' }).click();
  await figures
    .getByRole('textbox', { name: /^Chiffre/ })
    .last()
    .fill('42');
  await figures
    .getByRole('textbox', { name: /^Ce qu'il compte/ })
    .last()
    .fill('associations');
  await expect(row(page, 'Chiffres clés')).toContainText('2 chiffres : habitants, associations');
});
