/**
 * Apparence (#144, handoff 6.7, parcours B) : galerie des thèmes, aperçu plein écran du vrai site
 * dans un thème, confirmation avec mise en ligne immédiate cochée par défaut. Seuls les thèmes
 * construits sont proposés ; les autres sont « bientôt disponibles ».
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

test('galerie : thème actif marqué, les autres prévisualisables et proposés, rappel sur les couleurs', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mon-site/apparence');
  await expect(page.getByRole('heading', { level: 1, name: 'Apparence' })).toBeVisible();
  const cards = page.getByRole('list', { name: 'Thèmes' }).getByRole('listitem');
  await expect(cards).toHaveCount(4);
  const active = cards.filter({ hasText: 'Institutionnel' });
  await expect(active).toContainText('Thème actif');
  await expect(active.getByRole('img', { name: "Page d'accueil dans le thème Institutionnel" })).toBeVisible();
  // Déjà actif : on peut le prévisualiser, pas le choisir
  await expect(active.getByRole('button', { name: 'Choisir le thème Institutionnel' })).toHaveCount(0);
  // Les autres thèmes (tous construits) : prévisualisables et proposés
  for (const name of ['Moderne', 'Journal', 'Bourg']) {
    const card = cards.filter({ hasText: name });
    await expect(card.getByRole('img', { name: `Page d'accueil dans le thème ${name}` })).toBeVisible();
    await expect(card.getByRole('button', { name: `Choisir le thème ${name}` })).toBeVisible();
    await expect(card).not.toContainText('Bientôt disponible');
  }
  await expect(page.getByText('Les couleurs et les polices ne se règlent pas')).toBeVisible();
  await expectNoViolations(page);
});

test('aperçu plein écran : le vrai site dans le thème, thèmes à venir non sélectionnables', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mon-site/apparence');
  await page.getByRole('button', { name: 'Prévisualiser le thème Institutionnel' }).click();
  const preview = page.getByRole('dialog', { name: 'Aperçu de votre site dans le thème Institutionnel' });
  await expect(preview.getByTitle(/Votre site dans le thème Institutionnel/)).toHaveAttribute(
    'src',
    /theme=institutionnel/,
  );
  await expect(preview.getByRole('radio', { name: /Institutionnel/ })).toBeChecked();
  await expect(preview.getByRole('radio', { name: /Moderne/ })).toBeEnabled();
  await expect(preview.getByRole('radio', { name: /Journal/ })).toBeEnabled();
  await expect(preview.getByRole('radio', { name: /Bourg/ })).toBeEnabled();
  await expect(preview.getByRole('button', { name: /Choisir le thème/ })).toHaveCount(0);
  await expectNoViolations(page);
  await preview.getByRole('button', { name: "Fermer l'aperçu" }).click();
  await expect(preview).toBeHidden();
  await expect(page.getByRole('button', { name: 'Prévisualiser le thème Institutionnel' })).toBeFocused();
});

test('changer de thème : aperçu, confirmation, enregistré et mis en ligne', async ({ page }) => {
  // Commune restée sur un thème pas encore construit : l'Institutionnel est proposé
  const { bodies, calls } = await mockApi(page, { theme: 'journal' });
  await page.goto('/mon-site/apparence');
  await expect(
    page.getByRole('list', { name: 'Thèmes' }).getByRole('listitem').filter({ hasText: 'Journal' }),
  ).toContainText('Thème actif');
  await page.getByRole('button', { name: 'Prévisualiser le thème Institutionnel' }).click();
  const preview = page.getByRole('dialog', { name: 'Aperçu de votre site dans le thème Institutionnel' });
  await preview.getByRole('button', { name: 'Choisir le thème Institutionnel' }).click();

  const confirm = page.getByRole('alertdialog', { name: 'Passer au thème Institutionnel ?' });
  await expect(confirm).toContainText('Vos contenus sont conservés, seule la présentation change.');
  await expect(
    confirm.getByRole('checkbox', { name: 'Mettre en ligne immédiatement après le changement' }),
  ).toBeChecked();
  await expectNoViolations(page);
  await confirm.getByRole('button', { name: 'Passer au thème Institutionnel' }).click();
  await expect(confirm).toBeHidden();
  await expect(preview).toBeHidden();

  expect(bodies.filter((entry) => entry.call === 'PUT site').at(-1)!.body.data).toEqual({ theme: 'institutionnel' });
  await expect.poll(() => calls).toContain('POST /api/deployment/trigger');
  await expect(
    page.getByRole('status').filter({ hasText: 'Le thème Institutionnel est en cours de mise en ligne' }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Thèmes' }).getByRole('listitem').filter({ hasText: 'Institutionnel' }),
  ).toContainText('Thème actif');
});

test('changer de thème sans mettre en ligne : enregistré seulement', async ({ page }) => {
  const { bodies, calls } = await mockApi(page, { theme: 'journal' });
  await page.goto('/mon-site/apparence');
  await page.getByRole('button', { name: 'Choisir le thème Institutionnel' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Passer au thème Institutionnel ?' });
  await confirm.getByRole('checkbox', { name: /Mettre en ligne immédiatement/ }).uncheck();
  await confirm.getByRole('button', { name: 'Passer au thème Institutionnel' }).click();
  await expect(
    page.getByRole('status').filter({
      hasText: 'Thème Institutionnel enregistré. Il sera visible sur le site à la prochaine mise en ligne.',
    }),
  ).toBeVisible();
  expect(bodies.filter((entry) => entry.call === 'PUT site')).toHaveLength(1);
  expect(calls).not.toContain('POST /api/deployment/trigger');
});

test('réservé aux administrateurs', async ({ page }) => {
  await mockApi(page, { user: 'editor' });
  await page.goto('/mon-site/apparence');
  await expect(page.getByRole('heading', { level: 1, name: /réservée aux administrateurs/i })).toBeVisible();
});
