/**
 * Accès au compte (#132) : connexion, mot de passe oublié, invitation et nouveau mot de passe,
 * session expirée en cours de travail, pages réservées aux administrateurs, choix de la commune
 * par l'équipe Communeo.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi, PASSWORD } from './api';
import { expectNoViolations } from './axe';

const onlyDesktop = (page: Page) => test.skip(page.viewportSize()?.width !== 1440, 'une largeur suffit');
// Libellé exact, astérisque des champs obligatoires compris
const password = (page: Page, name = 'Mot de passe') => page.getByLabel(new RegExp(`^${name}\\*?$`));

test.describe('connexion', () => {
  test('« Rester connecté » est transmis, le mot de passe peut être affiché', async ({ page }) => {
    const { posts } = await mockApi(page, { loggedIn: false });
    await page.goto('/connexion');
    await expect(page).toHaveTitle('Connexion · Communeo');
    await page.getByRole('textbox', { name: 'E-mail' }).fill('sophie.leroy@saint-aubin.fr');
    await password(page).fill(PASSWORD);
    const toggle = page.getByRole('button', { name: 'Afficher le mot de passe' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(password(page)).toHaveAttribute('type', 'text');
    await page.getByRole('checkbox', { name: /Rester connecté/ }).check();
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
    expect(posts['/api/session/login']).toEqual([{ identifier: 'sophie.leroy@saint-aubin.fr', password: PASSWORD, remember: true }]);
  });

  test('champs vides : récapitulatif des erreurs', async ({ page }) => {
    await mockApi(page, { loggedIn: false });
    await page.goto('/connexion');
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('alert').filter({ hasText: '2 champs à remplir' })).toBeFocused();
  });

  test('un retour vers un autre site est ignoré', async ({ page }) => {
    await mockApi(page, { loggedIn: false });
    await page.goto('/connexion?retour=//exemple.com/piege');
    await page.getByRole('textbox', { name: 'E-mail' }).fill('sophie.leroy@saint-aubin.fr');
    await password(page).fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/');
  });
});

test.describe('mot de passe oublié', () => {
  test('même message que le compte existe ou non, focus sur la confirmation', async ({ page }) => {
    const { posts } = await mockApi(page, { loggedIn: false });
    await page.goto('/connexion');
    await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Mot de passe oublié' })).toBeVisible();
    await page.getByRole('textbox', { name: 'E-mail' }).fill('inconnu@exemple.fr');
    await page.getByRole('button', { name: 'Recevoir un lien' }).click();
    const status = page.getByRole('status').filter({ hasText: 'Si un compte existe pour inconnu@exemple.fr' });
    await expect(status).toBeFocused();
    await expect(status).toContainText('valable 1 heure');
    expect(posts['/api/user-management/forgot-password']).toEqual([{ email: 'inconnu@exemple.fr' }]);
    await expectNoViolations(page);
  });
});

test.describe('invitation et nouveau mot de passe', () => {
  test('invitation : accueil, robustesse annoncée, compte créé puis connecté', async ({ page }) => {
    const { posts } = await mockApi(page, { loggedIn: false });
    await page.goto('/invitation?jeton=jeton-invitation');
    await expect(page.getByRole('heading', { level: 1, name: 'Bienvenue, Anne' })).toBeVisible();
    await expect(page.getByText(/invité comme éditeur sur le site de Saint-Aubin-sur-Loire/)).toBeVisible();

    await password(page).fill('court');
    await expect(page.getByText('Trop court : 5 caractères sur 10 minimum. Ajoutez des mots.')).toBeVisible();
    await expect(password(page)).toHaveAccessibleDescription(/Trop court/);
    await password(page).fill('loire jardin');
    await expect(page.getByText(/^Correct · 12 caractères/)).toBeVisible();
    await password(page).fill('loire jardin tilleul');
    await expect(page.getByText('Robuste · 20 caractères')).toBeVisible();
    await expectNoViolations(page);

    await password(page, 'Confirmer le mot de passe').fill('autre chose');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page.getByRole('alert').filter({ hasText: '1 champ à corriger' })).toBeFocused();
    await expect(page.getByText('Les deux mots de passe ne sont pas identiques').first()).toBeVisible();

    await password(page, 'Confirmer le mot de passe').fill('loire jardin tilleul');
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
    expect(posts['/api/user-management/accept-invitation']).toEqual([{ token: 'jeton-invitation', password: 'loire jardin tilleul', passwordConfirmation: 'loire jardin tilleul' }]);
    expect(posts['/api/session/login']).toEqual([{ identifier: 'anne@saint-aubin.fr', password: 'loire jardin tilleul', remember: false }]);
  });

  test('nouveau mot de passe : le compte est nommé', async ({ page }) => {
    await mockApi(page, { loggedIn: false });
    await page.goto('/nouveau-mot-de-passe?jeton=jeton-reinitialisation');
    await expect(page.getByRole('heading', { level: 1, name: 'Nouveau mot de passe' })).toBeVisible();
    await expect(page.getByText('sophie.leroy@saint-aubin.fr')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer le mot de passe' })).toBeVisible();
  });

  test('lien expiré : nouvelle invitation demandée aux administrateurs', async ({ page }) => {
    const { posts } = await mockApi(page, { loggedIn: false });
    await page.goto('/invitation?jeton=jeton-expire');
    await expect(page.getByRole('heading', { level: 1, name: "Ce lien n'est plus valable" })).toBeVisible();
    await expect(page.getByText(/valables 7 jours/)).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole('button', { name: 'Demander une nouvelle invitation' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Demande envoyée' })).toBeFocused();
    expect(posts['/api/user-management/request-invitation']).toEqual([{ jeton: 'jeton-expire' }]);
  });

  test('lien invalide ou absent : explication et nouveau lien', async ({ page }) => {
    await mockApi(page, { loggedIn: false });
    for (const url of ['/invitation?jeton=faux', '/nouveau-mot-de-passe']) {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1, name: 'Ce lien ne fonctionne pas' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Recevoir un nouveau lien' })).toBeVisible();
    }
  });
});

test.describe('session expirée', () => {
  test('reconnexion sur place : la page reste, le brouillon en échec est enregistré', async ({ page }) => {
    const { expireSession, bodies } = await mockApi(page);
    await page.clock.install();
    await page.goto('/pages/p-salle');
    const title = page.getByRole('textbox', { name: 'Titre', exact: true });
    await expect(title).toHaveValue('Location de la salle des fêtes');
    expireSession();
    await title.fill('Location de la salle des fêtes municipale');
    await page.clock.fastForward(6000);

    const dialog = page.getByRole('dialog', { name: 'Votre session a expiré' });
    await expect(dialog).toBeVisible();
    await expectNoViolations(page);
    // Pas de fermeture sans se reconnecter
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();

    const field = dialog.getByLabel('Mot de passe de sophie.leroy@saint-aubin.fr', { exact: true });
    await field.fill('mauvais');
    await dialog.getByRole('button', { name: 'Se reconnecter' }).click();
    await expect(dialog.getByRole('alert')).toContainText('E-mail ou mot de passe incorrect');
    await field.fill(PASSWORD);
    await dialog.getByRole('button', { name: 'Se reconnecter' }).click();
    await expect(dialog).toBeHidden();
    await expect(title).toHaveValue('Location de la salle des fêtes municipale');
    // Refusé pendant l'expiration (non reçu), le brouillon est renvoyé dès la reconnexion
    await expect.poll(() => bodies.filter((entry) => entry.body.data.title === 'Location de la salle des fêtes municipale').length).toBe(1);
    await expect(page.getByText(/Brouillon enregistré/).first()).toBeVisible();
  });
});

test.describe('rôles', () => {
  test('un éditeur qui ouvre une page réservée sait qui contacter', async ({ page }) => {
    await mockApi(page, { user: 'editor' });
    await page.goto('/utilisateurs');
    await expect(page.getByRole('heading', { level: 1, name: 'Cette page est réservée aux administrateurs' })).toBeVisible();
    await expect(page.getByText("La gestion des utilisateurs n'est pas accessible avec votre rôle d'éditeur. Demandez à Sophie Leroy ou Claire Martin.")).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole('link', { name: 'Retour au tableau de bord' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
  });

  test('un administrateur y a accès', async ({ page }) => {
    onlyDesktop(page);
    await mockApi(page);
    await page.goto('/mon-site/apparence');
    await expect(page.getByRole('heading', { level: 1, name: 'Apparence' })).toBeVisible();
  });

  test('équipe Communeo : choix de la commune, bandeau, retour à la liste', async ({ page }) => {
    await mockApi(page, { user: 'super_admin' });
    await page.goto('/actualites');
    await expect(page).toHaveURL(/\/communes$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Choisir une commune' })).toBeVisible();
    await expectNoViolations(page);
    await page.getByRole('searchbox', { name: 'Rechercher' }).fill('belle');
    await expect(page.getByRole('button', { name: /Saint-Aubin/ })).toHaveCount(0);
    await page.getByRole('button', { name: /Bellefontaine/ }).click();

    const banner = page.getByRole('region', { name: 'Mode équipe Communeo' });
    await expect(banner).toContainText("Vous consultez l'administration de Bellefontaine");
    await expect(page.getByRole('heading', { level: 1, name: 'Tableau de bord' })).toBeVisible();
    await banner.getByRole('button', { name: 'Quitter' }).click();
    await expect(page).toHaveURL(/\/communes$/);
  });
});
