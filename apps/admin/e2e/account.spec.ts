/**
 * Mon compte (#367) : adresse et rôle en lecture, prénom et nom, mot de passe (actuel exigé,
 * 10 caractères minimum), lien de réinitialisation si l'actuel est oublié.
 */
import { expect, test, type Locator } from '@playwright/test';
import { mockApi, PASSWORD } from './api';
import { expectNoViolations } from './axe';

/** Champ mot de passe (pas de rôle textbox) par son libellé, astérisque compris */
const pwd = (scope: Locator, name: string) => scope.getByLabel(new RegExp(`^${name}\\*?$`));

test('adresse, rôle et commune en lecture, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/mon-compte');
  await expect(page.getByRole('heading', { level: 1, name: 'Mon compte' })).toBeVisible();
  const summary = page.getByRole('region', { name: 'Connexion et rôle' });
  await expect(summary).toContainText('sophie.leroy@saint-aubin.fr');
  await expect(summary).toContainText('Pour en changer, contactez l’équipe Communeo.');
  await expect(summary).toContainText('Administrateur · Saint-Aubin-sur-Loire');
  await expect(page.getByRole('textbox', { name: 'Prénom', exact: true })).toHaveValue('Sophie');
  await expect(page.getByRole('textbox', { name: 'Nom', exact: true })).toHaveValue('Leroy');
  await expectNoViolations(page);
});

test('éditeur : son rôle expliqué, et qui peut le changer', async ({ page }) => {
  await mockApi(page, { user: 'editor' });
  await page.goto('/mon-compte');
  const summary = page.getByRole('region', { name: 'Connexion et rôle' });
  await expect(summary).toContainText('Éditeur · Saint-Aubin-sur-Loire');
  await expect(summary).toContainText('Un administrateur de la commune peut changer votre rôle.');
});

test('prénom et nom : vérifiés, enregistrés, repris dans le menu du compte', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/mon-compte');
  const save = page.getByRole('button', { name: 'Enregistrer' });
  await expect(save).toBeDisabled();

  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill('  ');
  await save.click();
  await expect(page.getByRole('alert').filter({ hasText: '1 champ à corriger' })).toBeFocused();
  await expect(page.getByRole('region', { name: /Prénom et nom/ })).toContainText('Indiquez votre nom');

  await page.getByRole('textbox', { name: 'Prénom', exact: true }).fill('Sophie-Anne');
  await page.getByRole('textbox', { name: 'Nom', exact: true }).fill(' Leroy-Martin ');
  await save.click();
  await expect(page.getByRole('status').filter({ hasText: 'Nom enregistré.' })).toBeVisible();
  expect(bodies.find((entry) => entry.call === 'PUT me')!.body.data).toEqual({ first_name: 'Sophie-Anne', last_name: 'Leroy-Martin' });
  await expect(save).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Compte de Sophie-Anne Leroy-Martin' })).toBeVisible();
});

test('nom modifié puis départ : la fenêtre « modifications non enregistrées » s’ouvre', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) < 768, 'navigation latérale sur ordinateur');
  await mockApi(page);
  await page.goto('/mon-compte');
  await page.getByRole('textbox', { name: 'Prénom', exact: true }).fill('Sophia');
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Pages' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
});

test('mot de passe : actuel faux refusé, règles vérifiées, puis changé', async ({ page }) => {
  const { bodies } = await mockApi(page);
  await page.goto('/mon-compte');
  const section = page.getByRole('region', { name: /^Mot de passe/ });
  const submit = section.getByRole('button', { name: 'Changer le mot de passe' });

  await submit.click();
  await expect(page.getByRole('alert').filter({ hasText: '3 champs à corriger' })).toBeFocused();

  await pwd(section, 'Mot de passe actuel').fill('pas-le-bon');
  await pwd(section, 'Nouveau mot de passe').fill('court');
  await expect(section.getByText('Trop court : 5 caractères sur 10 minimum. Ajoutez des mots.')).toBeVisible();
  await pwd(section, 'Confirmer le nouveau mot de passe').fill('autre');
  await submit.click();
  await expect(section).toContainText('Le mot de passe doit contenir au moins 10 caractères');
  await expect(section).toContainText('Les deux mots de passe ne sont pas identiques');

  await pwd(section, 'Nouveau mot de passe').fill('riviere et peupliers');
  await pwd(section, 'Confirmer le nouveau mot de passe').fill('riviere et peupliers');
  await submit.click();
  // Refus du serveur : le champ est en erreur, le récapitulatif prend le focus comme pour les autres erreurs
  const current = pwd(section, 'Mot de passe actuel');
  await expect(page.getByRole('alert').filter({ hasText: '1 champ à corriger' })).toBeFocused();
  await expect(current).toHaveAttribute('aria-invalid', 'true');
  await expect(section).toContainText('Le mot de passe actuel est incorrect');
  await expectNoViolations(page);

  await current.fill(PASSWORD);
  await submit.click();
  await expect(page.getByRole('status').filter({ hasText: 'Mot de passe changé. Vos autres sessions ont été fermées.' })).toBeVisible();
  expect(bodies.filter((entry) => entry.call === 'PUT me/password').at(-1)!.body.data).toEqual({
    currentPassword: PASSWORD,
    password: 'riviere et peupliers',
    passwordConfirmation: 'riviere et peupliers',
  });
  await expect(current).toHaveValue('');
});

test('mot de passe actuel oublié : un lien est envoyé à l’adresse du compte', async ({ page }) => {
  const { calls } = await mockApi(page);
  await page.goto('/mon-compte');
  await page.getByRole('button', { name: 'Mot de passe actuel oublié ?' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Lien envoyé à sophie.leroy@saint-aubin.fr, valable 1 heure.' })).toBeVisible();
  expect(calls).toContain('POST /api/user-management/me/reset-password');
});

// Mode clair / sombre dans le profil (#366)
test('affichage : choisi dans le menu du compte, repris dans Mon compte, sans violation en sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: /^Compte de/ }).click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitemradio', { name: 'Comme le système' })).toHaveAttribute('aria-checked', 'true');
  await menu.getByRole('menuitemradio', { name: 'Sombre' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.goto('/mon-compte');
  const display = page.getByRole('group', { name: 'Affichage' });
  await expect(display.getByRole('radio', { name: /^Sombre/ })).toBeChecked();
  await page.waitForTimeout(300); // fin de la transition de couleurs
  await expectNoViolations(page);
  // « Comme le système » : le système est en clair
  await display.getByRole('radio', { name: /^Comme le système/ }).check();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await display.getByRole('radio', { name: /^Clair/ }).check();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  // Gardé au rechargement
  await page.reload();
  await expect(page.getByRole('group', { name: 'Affichage' }).getByRole('radio', { name: /^Clair/ })).toBeChecked();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('mobile : plus de mode sombre dans la navigation ; ordinateur : bascule rapide dans l’en-tête', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  if (mobile) {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Mode sombre' })).toHaveCount(0);
    await expect(drawer).not.toContainText('Mode sombre');
  } else {
    const toggle = page.getByRole('banner').getByRole('button', { name: 'Mode sombre' });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: /^Compte de/ }).click();
    await expect(page.getByRole('menuitemradio', { name: 'Sombre' })).toHaveAttribute('aria-checked', 'true');
  }
});
