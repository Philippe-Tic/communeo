/** Être bien trouvé (#336) : liste de contrôle de l'écran Mise en ligne */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';

test('trois démarches, état vérifié ou à faire, « C’est fait » pour la fiche Google', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/mise-en-ligne');
  const section = page.getByRole('region', { name: 'Être bien trouvé sur Internet' });
  await expect(section).toContainText('2 démarches à faire.');
  await expect(section.getByRole('heading', { name: '1. Annuaire de l’administration (service-public.fr)' })).toBeVisible();
  await expect(section.getByText('L’Annuaire indique bien votre site.')).toBeVisible();
  await expect(section.getByText('Wikidata indique encore : http://ancien.fr.')).toBeVisible();

  const google = section.getByRole('button', { name: 'C’est fait', exact: true }).first();
  await google.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: '« Fiche Google de la mairie » noté comme fait.' })).toBeVisible();
  await expect(section).toContainText('1 démarche à faire.');
  expect(api.bodies.find((entry) => entry.call === 'seo google')?.body.data).toEqual({ done: true });
});
