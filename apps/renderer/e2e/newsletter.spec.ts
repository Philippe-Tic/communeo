/**
 * Inscription à la lettre d'information depuis l'accueil, dans chaque thème (API simulée) :
 * adresse invalide signalée sur le champ, réussite annoncée, adresse déjà inscrite.
 */
import { expect, test } from '@playwright/test';

test('lettre d’information : erreur de saisie, inscription, adresse déjà inscrite', async ({ page }) => {
  const sent: unknown[] = [];
  let status = 201;
  await page.route('**/api/newsletter-subscribers/public', async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  const form = page.locator('[data-cn-newsletter]');
  const email = form.getByRole('textbox', { name: 'Votre adresse e-mail' });

  await email.fill('claire.martin@');
  await form.getByRole('button', { name: "S'inscrire" }).click();
  await expect(form.getByRole('alert')).toContainText("l'adresse doit contenir un « @ »");
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  expect(sent).toHaveLength(0);

  await email.fill('claire.martin@exemple.fr');
  await form.getByRole('button', { name: "S'inscrire" }).click();
  await expect(form.getByRole('status')).toContainText('Inscription confirmée');
  await expect(email).not.toHaveAttribute('aria-invalid');
  expect(sent[0]).toMatchObject({ data: { email: 'claire.martin@exemple.fr', website: '' } });

  status = 409;
  await email.fill('claire.martin@exemple.fr');
  await form.getByRole('button', { name: "S'inscrire" }).click();
  await expect(form.getByRole('alert')).toContainText('déjà inscrite');
});
