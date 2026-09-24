/**
 * Utilisateurs (#146, handoff 6.16) : liste avec l'état en badge, invitation avec les rôles
 * expliqués, actions du menu (renvoyer, réinitialiser, rôle, désactiver, supprimer), garde-fou
 * du dernier administrateur, réservé aux administrateurs.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const row = (page: Page, name: string) => {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  return mobile
    ? page.getByRole('region', { name: 'Comptes de la commune' }).getByRole('listitem').filter({ hasText: name })
    : page.getByRole('row').filter({ hasText: name });
};
const actions = (page: Page, name: string) => page.getByRole('button', { name: `Actions pour ${name}` });

test('liste : états, vous sans menu, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/utilisateurs');
  await expect(page.getByRole('heading', { level: 1, name: 'Utilisateurs' })).toBeVisible();
  await expect(page.getByText('3 comptes · 1 invitation en attente')).toBeVisible();
  await expect(row(page, 'Sophie Leroy')).toContainText('(vous)');
  await expect(actions(page, 'Sophie Leroy')).toHaveCount(0);
  await expect(row(page, 'Anne Rousseau')).toContainText('Invitation en attente');
  await expect(row(page, 'Claire Martin')).toContainText('Administrateur');
  await expectNoViolations(page);
});

test('inviter : rôles expliqués, champs vérifiés, invitation envoyée', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/utilisateurs');
  await page.getByRole('button', { name: 'Inviter un utilisateur' }).click();
  const dialog = page.getByRole('dialog', { name: 'Inviter un utilisateur' });
  await expect(dialog.getByRole('radio', { name: /Éditeur/ })).toBeChecked();
  await expect(dialog).toContainText('Ne gère ni les utilisateurs, ni le thème, ni le domaine.');
  await dialog.getByRole('button', { name: "Envoyer l'invitation" }).click();
  await expect(dialog.getByRole('alert').filter({ hasText: '3 champs à compléter' })).toBeFocused();
  await dialog.getByRole('textbox', { name: /^Prénom/ }).fill('Julien');
  await dialog.getByRole('textbox', { name: /^Nom/ }).fill('Morel');
  await dialog.getByRole('textbox', { name: /^E-mail/ }).fill('Julien.Morel@Saint-Aubin.fr');
  await dialog.getByRole('radio', { name: /Administrateur/ }).check();
  await expectNoViolations(page);
  await dialog.getByRole('button', { name: "Envoyer l'invitation" }).click();
  await expect(dialog).toBeHidden();
  expect(bodies.find((entry) => entry.call === 'POST user')!.body.data).toEqual({
    username: 'julien.morel@saint-aubin.fr',
    email: 'julien.morel@saint-aubin.fr',
    first_name: 'Julien',
    last_name: 'Morel',
    municipality_role: 'admin',
  });
  await expect(page.getByText('3 comptes · 2 invitations en attente')).toBeVisible();
});

test('inviter une adresse déjà utilisée : expliqué dans la fenêtre', async ({ page }) => {
  await mockApi(page);
  await page.goto('/utilisateurs');
  await page.getByRole('button', { name: 'Inviter un utilisateur' }).click();
  const dialog = page.getByRole('dialog', { name: 'Inviter un utilisateur' });
  await dialog.getByRole('textbox', { name: /^Prénom/ }).fill('Marc');
  await dialog.getByRole('textbox', { name: /^Nom/ }).fill('Dubois');
  await dialog.getByRole('textbox', { name: /^E-mail/ }).fill('marc@saint-aubin.fr');
  await dialog.getByRole('button', { name: "Envoyer l'invitation" }).click();
  await expect(dialog.getByRole('alert')).toHaveText(
    "L'invitation n'a pas été envoyée : Un utilisateur avec cet email existe déjà",
  );
});

test('actions : renvoyer, réinitialiser, rôle, désactiver puis réactiver, supprimer', async ({ page }) => {
  const { bodies, calls } = await mockApi(page);
  await page.goto('/utilisateurs');

  await actions(page, 'Anne Rousseau').click();
  await expect(page.getByRole('menuitem')).toHaveText([
    "Renvoyer l'invitation",
    'Changer le rôle…',
    'Désactiver…',
    'Supprimer…',
  ]);
  await page.getByRole('menuitem', { name: "Renvoyer l'invitation" }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Nouvelle invitation envoyée à anne.rousseau@saint-aubin.fr.' }),
  ).toBeVisible();
  await expect.poll(() => calls).toContain('POST resend-invitation 7');

  await actions(page, 'Marc Dubois').click();
  await page.getByRole('menuitem', { name: 'Réinitialiser le mot de passe' }).click();
  await expect.poll(() => calls).toContain('POST reset-password 2');

  await actions(page, 'Marc Dubois').click();
  await page.getByRole('menuitem', { name: 'Changer le rôle…' }).click();
  const role = page.getByRole('dialog', { name: 'Rôle de Marc Dubois' });
  await role.getByRole('radio', { name: /Administrateur/ }).check();
  await role.getByRole('button', { name: 'Enregistrer le rôle' }).click();
  await expect(role).toBeHidden();
  expect(bodies.find((entry) => entry.call === 'PUT user 2')!.body.data).toEqual({ municipality_role: 'admin' });

  await actions(page, 'Claire Martin').click();
  await page.getByRole('menuitem', { name: 'Désactiver…' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Désactiver le compte de Claire Martin ?' });
  await expect(confirm).toContainText('elle est déconnectée tout de suite');
  await confirm.getByRole('button', { name: 'Désactiver le compte' }).click();
  await expect(row(page, 'Claire Martin')).toContainText('Désactivé');
  await actions(page, 'Claire Martin').click();
  await page.getByRole('menuitem', { name: 'Réactiver' }).click();
  await expect(row(page, 'Claire Martin')).toContainText('Actif');

  await actions(page, 'Anne Rousseau').click();
  await page.getByRole('menuitem', { name: 'Supprimer…' }).click();
  await page
    .getByRole('alertdialog', { name: 'Supprimer le compte de Anne Rousseau ?' })
    .getByRole('button', { name: 'Supprimer le compte' })
    .click();
  await expect(row(page, 'Anne Rousseau')).toHaveCount(0);
});

test('rôle : un administrateur peut en rétrograder un autre (refus du dernier : test backend)', async ({ page }) => {
  await mockApi(page);
  await page.goto('/utilisateurs');
  await actions(page, 'Claire Martin').click();
  await page.getByRole('menuitem', { name: 'Changer le rôle…' }).click();
  await page
    .getByRole('dialog', { name: 'Rôle de Claire Martin' })
    .getByRole('radio', { name: /Éditeur/ })
    .check();
  await page.getByRole('button', { name: 'Enregistrer le rôle' }).click();
  await expect(row(page, 'Claire Martin')).toContainText('Éditeur');
});

test('réservé aux administrateurs', async ({ page }) => {
  await mockApi(page, { user: 'editor' });
  await page.goto('/utilisateurs');
  await expect(page.getByRole('heading', { level: 1, name: /réservée aux administrateurs/i })).toBeVisible();
});
