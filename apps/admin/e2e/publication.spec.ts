/**
 * Mise en ligne et domaine (#145, handoff 6.12) : carte d'état (en attente avec la liste, en cours
 * par étapes, échec avec référence, à jour), historique avec détail des échecs, domaine personnalisé
 * réservé aux administrateurs (instructions DNS, vérification, attendu / trouvé, retrait).
 */
import { expect, test } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

test('en attente : ce qui sera mis en ligne, historique, mise en ligne lancée', async ({ page }) => {
  const { calls } = await mockApi(page);
  await page.goto('/mise-en-ligne');
  await expect(page.getByRole('heading', { level: 1, name: 'Mise en ligne' })).toBeVisible();
  await expect(page.getByRole('heading', { name: "3 modifications attendent d'être mises en ligne" })).toBeVisible();
  const pending = page.getByRole('region', { name: 'Ce qui sera mis en ligne' });
  await expect(pending.getByRole('listitem')).toHaveText([
    'Page modifiée — Location de la salle des fêtes',
    'Actualité publiée — Conseil municipal du 3 octobre',
    'Réglages du site modifiés',
  ]);
  await expect(pending.getByRole('link', { name: 'Page modifiée — Location de la salle des fêtes' })).toHaveAttribute(
    'href',
    '/pages/p-salle',
  );

  const history = page.getByRole('region', { name: 'Historique' });
  // Mobile : la durée passe sous le déclencheur, sa colonne est masquée
  const narrow = (page.viewportSize()?.width ?? 1440) < 640;
  await expect(history.getByRole('columnheader')).toHaveText(
    narrow ? ['Date', 'Déclenchée par', 'Résultat'] : ['Date', 'Déclenchée par', 'Durée', 'Résultat'],
  );
  const rows = history.getByRole('row');
  await expect(rows.nth(1)).toContainText('Sophie Leroy');
  await expect(rows.nth(1)).toContainText('24 s');
  await expect(rows.nth(1)).toContainText('Réussie');
  await expect(rows.nth(2)).toContainText('Publication programmée');
  await expect(rows.nth(2)).toContainText('2 min 10 s');
  await expect(rows.nth(3)).toContainText('Changement de domaine');
  await history.getByRole('button', { name: /Détail/ }).click();
  await expect(history).toContainText("Référence à communiquer à l'assistance : MEL-2026-0918-1120");
  await expectNoViolations(page);

  await page.getByRole('button', { name: 'Mettre en ligne maintenant' }).click();
  await expect.poll(() => calls).toContain('POST /api/deployment/trigger');
  await expect(page.getByRole('heading', { name: /Mise en ligne (en cours|demandée)/ })).toBeVisible();
});

test('en cours : étapes nommées, étape courante marquée', async ({ page }) => {
  await mockApi(page, { publication: 'running' });
  await page.goto('/mise-en-ligne');
  await expect(page.getByRole('heading', { name: 'Mise en ligne en cours' })).toBeVisible();
  const steps = page.getByRole('list', { name: 'Étapes', exact: true }).getByRole('listitem');
  await expect(steps).toHaveText([
    'Vérification des contenus : terminée',
    'Préparation des pages : en cours',
    'Publication sur le site : à venir',
    'Vidage du cache : à venir',
  ]);
  await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(page.getByText("Vous pouvez quitter cette page, l'opération continue.", { exact: false })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ce qui sera mis en ligne' })).toHaveCount(0);
  await expectNoViolations(page);
});

test('échec : rien n’est modifié, référence, réessayer', async ({ page }) => {
  const { calls } = await mockApi(page, { publication: 'failed' });
  await page.goto('/mise-en-ligne');
  await expect(page.getByRole('heading', { name: 'La mise en ligne a échoué' })).toBeVisible();
  await expect(page.getByText("Rien n'a été modifié sur votre site")).toBeVisible();
  await expect(page.getByText('Référence à communiquer : MEL-2026-0922-1120')).toBeVisible();
  await expect(page.getByRole('link', { name: /Contacter l'assistance/ })).toHaveAttribute(
    'href',
    'https://doc.communeo.fr',
  );
  await expectNoViolations(page);
  await page
    .getByRole('region', { name: 'La mise en ligne a échoué' })
    .getByRole('button', { name: 'Réessayer' })
    .click();
  await expect.poll(() => calls).toContain('POST /api/deployment/trigger');
});

test('à jour : dernière mise en ligne, lien vers le site', async ({ page }) => {
  await mockApi(page, { publication: 'ok' });
  await page.goto('/mise-en-ligne');
  await expect(page.getByRole('heading', { name: 'Votre site est à jour' })).toBeVisible();
  await expect(page.getByText(/Dernière mise en ligne .*, en 24 s/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Ouvrir saint-aubin-sur-loire\.fr/ })).toBeVisible();
});

test('domaine : saisie, instructions DNS copiables, vérification en erreur puis réussie', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
  const { posts, calls } = await mockApi(page, { domainMismatch: true });
  await page.goto('/mise-en-ligne');
  const domain = page.getByRole('region', { name: 'Domaine personnalisé' });
  await expect(domain.getByRole('listitem').first()).toHaveAttribute('aria-current', 'step');

  await domain.getByRole('textbox', { name: 'Adresse de votre site' }).fill('https://Saint-Aubin-sur-Loire');
  await domain.getByRole('button', { name: 'Enregistrer le domaine' }).click();
  await expect(domain.getByRole('alert')).toHaveText(
    'Indiquez un nom de domaine, par exemple saint-aubin-sur-loire.fr',
  );
  await domain.getByRole('textbox', { name: 'Adresse de votre site' }).fill('mairie-deja-prise.fr');
  await domain.getByRole('button', { name: 'Enregistrer le domaine' }).click();
  await expect(domain.getByRole('alert')).toHaveText('Ce domaine est déjà utilisé par un autre site');
  await domain.getByRole('textbox', { name: 'Adresse de votre site' }).fill('https://Saint-Aubin-sur-Loire.fr/');
  await domain.getByRole('button', { name: 'Enregistrer le domaine' }).click();
  expect(posts['domain']).toEqual(['saint-aubin-sur-loire.fr']);

  const table = domain.getByRole('table', { name: 'Enregistrements DNS à créer' });
  await expect(table.getByRole('row')).toHaveCount(3);
  await expect(table).toContainText('75.2.60.5');
  await expect(domain.getByRole('link', { name: 'Envoyer par e-mail' })).toHaveAttribute(
    'href',
    /^mailto:\?subject=Configuration%20DNS%20de%20saint-aubin-sur-loire\.fr/,
  );
  await expectNoViolations(page);

  await domain.getByRole('button', { name: 'Vérifier maintenant' }).click();
  await expect.poll(() => calls).toContain('POST /api/domain/verify');
  await expect(
    domain.getByText("L'enregistrement A ne pointe pas vers la bonne adresse.", { exact: false }),
  ).toBeVisible();
  await expect(domain.getByText('Attendu (A)')).toBeVisible();
  await expect(domain).toContainText('92.243.16.8');
  await expect(domain.getByText('Dernier essai', { exact: false })).toBeVisible();
  await domain.getByRole('button', { name: 'Revoir les instructions DNS' }).click();
  await expect(table).toBeVisible();
  await expectNoViolations(page);
});

test('domaine vérifié : actif, retrait confirmé', async ({ page }) => {
  await mockApi(page, { domain: 'verified' });
  await page.goto('/mise-en-ligne');
  const domain = page.getByRole('region', { name: 'Domaine personnalisé' });
  await expect(domain).toContainText('certificat HTTPS actif, renouvelé automatiquement');
  await expect(domain.getByText('Actif', { exact: true })).toBeVisible();
  await domain.getByRole('button', { name: 'Retirer ce domaine' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Retirer saint-aubin-sur-loire.fr ?' });
  await confirm.getByRole('button', { name: 'Retirer le domaine' }).click();
  await expect(domain.getByRole('textbox', { name: 'Adresse de votre site' })).toBeVisible();
});

test('domaine indisponible (hébergeur non configuré) : expliqué', async ({ page }) => {
  await mockApi(page, { domain: 'unavailable' });
  await page.goto('/mise-en-ligne');
  await expect(page.getByRole('region', { name: 'Domaine personnalisé' })).toContainText(
    "La gestion du domaine n'est pas disponible pour le moment.",
  );
});

test('un éditeur ne voit pas la gestion du domaine', async ({ page }) => {
  await mockApi(page, { user: 'editor' });
  await page.goto('/mise-en-ligne');
  await expect(page.getByRole('heading', { level: 1, name: 'Mise en ligne' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Historique' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Domaine personnalisé' })).toHaveCount(0);
});
