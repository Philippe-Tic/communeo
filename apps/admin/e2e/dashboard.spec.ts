/**
 * Tableau de bord (#147, handoff 6.6 variante 1f) : prochaine action de conformité, raccourcis,
 * messages non lus, mise en ligne, prochains événements, derniers contenus, conformité ; bandeau
 * de tuiles (1g) quand une alerte est en cours ; mobile dans l'ordre du handoff.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const wide = (page: Page) => (page.viewportSize()?.width ?? 1440) >= 1024;

test('accueil : prochaine action, raccourcis, messages non lus, événements, sans violation', async ({ page }) => {
  await mockApi(page, { alertSet: 'none' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Bonjour Sophie' })).toBeVisible();
  await expect(page).toHaveTitle(/^Tableau de bord — /);
  await expect(page.getByText(/messages? non lus?$/).first()).toBeVisible();

  // Prochaine action : issue de la conformité (la demande RGPD en retard du mock)
  if (wide(page)) {
    await expect(page.getByText('Prochaine action recommandée')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Compléter/ })).toHaveAttribute('href', '/messages?categorie=rgpd');
  } else {
    await expect(page.getByRole('link', { name: 'Répondre à la demande RGPD en retard' })).toBeVisible();
  }

  const shortcuts = page.getByRole('navigation', { name: 'Raccourcis' });
  await expect(shortcuts.getByRole('link', { name: 'Publier une alerte' })).toHaveAttribute(
    'href',
    '/alertes/nouvelle',
  );
  await expect(shortcuts.getByRole('link', { name: 'Nouvelle actualité' })).toHaveAttribute(
    'href',
    '/actualites/nouvelle',
  );
  await expect(shortcuts.getByRole('link', { name: 'Nouvel événement' })).toHaveAttribute('href', '/agenda/nouvelle');

  const messages = page.getByRole('region', { name: /^Messages non lus/ });
  await expect(messages.getByRole('listitem').first()).toContainText(/RGPD · répondre avant le/);
  await expect(messages.getByRole('listitem')).toHaveCount(3);

  const events = page.getByRole('region', { name: 'Prochains événements' });
  await expect(events).toContainText('Fête de la musique');
  await expect(events).toContainText('juin 2027');
  await expect(page.getByRole('region', { name: 'Derniers contenus modifiés' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.getByRole('heading', { level: 2, name: 'Conformité' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir la checklist' })).toHaveAttribute('href', '/conformite');
  if (wide(page)) await expect(page.getByRole('region', { name: 'Mise en ligne' })).toBeVisible();
  await expectNoViolations(page);

  // Un message ouvre la messagerie sur lui
  await messages.getByRole('listitem').first().getByRole('link').click();
  await expect(page).toHaveURL(/\/messages\?id=/);
});

test('alerte en cours : bandeau de tuiles (alerte, mise en ligne, conformité) sur ordinateur', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByText(/1 alerte active$/)).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Raccourcis' })).toContainText(
    "1 alerte active : Coupure d'eau rue des Lilas",
  );
  const tile = page.getByRole('region', { name: /^Alerte en cours/ });
  if (!wide(page)) {
    await expect(tile).toBeHidden();
    return;
  }
  await expect(tile).toContainText("Coupure d'eau rue des Lilas");
  await expect(tile.getByRole('link', { name: 'Modifier ou terminer' })).toHaveAttribute('href', /^\/alertes\/.+/);
  await expect(
    page.getByRole('region', { name: 'Mise en ligne' }).getByRole('link', { name: 'Historique' }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Conformité' }).getByRole('link', { name: /points? à compléter$/ }),
  ).toBeVisible();
  await expectNoViolations(page);
});

test('mobile : raccourcis d’abord, « Publier une alerte » en premier ; ordre du clavier = ordre affiché', async ({
  page,
}) => {
  test.skip(wide(page), 'mise en page mobile');
  await mockApi(page, { alertSet: 'none' });
  await page.goto('/');
  const shortcuts = page.getByRole('navigation', { name: 'Raccourcis' }).getByRole('link');
  await expect(shortcuts.first()).toHaveAccessibleName('Publier une alerte');
  const top = async (name: RegExp) => (await page.getByRole('heading', { level: 2, name }).boundingBox())!.y;
  expect(await top(/^Messages non lus/)).toBeLessThan(await top(/^Prochains événements/));
  const action = await page.getByRole('link', { name: 'Répondre à la demande RGPD en retard' }).boundingBox();
  expect(action!.y).toBeGreaterThan(await top(/^Messages non lus/));
});
