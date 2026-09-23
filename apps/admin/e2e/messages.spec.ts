/**
 * Messages des habitants (#140, handoff 6.14) : boîte de réception (non lus, RGPD surlignées avec le
 * délai, filtres), détail (ouverture notée, statut, historique), réponse par e-mail (#186) avec le
 * modèle RGPD à compléter, pièce jointe, échec d'envoi ; mobile : liste puis détail plein écran.
 */
import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './api';
import { expectNoViolations } from './axe';

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 1024;
const inbox = (page: Page) => page.getByRole('list', { name: 'Messages reçus' });
const row = (page: Page, reference: string) => inbox(page).getByRole('link', { name: new RegExp(reference) });
/** Le formulaire de réponse visible : en bas du détail, ou dans la feuille sur mobile */
async function replyForm(page: Page) {
  if (isMobile(page)) await page.getByRole('button', { name: 'Répondre', exact: true }).click();
  return page.getByRole('form', { name: /^Répondre à/ }).locator('visible=true');
}

test('boîte de réception : non lus, RGPD avec délai, sans violation', async ({ page }) => {
  await mockApi(page);
  await page.goto('/messages');
  await expect(page.getByRole('heading', { level: 1, name: 'Messages' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Messages' }).getByText('3 non lus')).toBeVisible();
  // Barre latérale (tiroir fermé sur mobile)
  if ((page.viewportSize()?.width ?? 1440) >= 768)
    await expect(page.getByRole('link', { name: /^Messages \(?3 non lus/ }).first()).toBeAttached();
  await expect(inbox(page).getByRole('listitem')).toHaveCount(6);
  await expect(row(page, 'SVE-2026-0042')).toContainText('(non lu)');
  await expect(row(page, 'SVE-2026-0042')).toContainText(/\d+ jours restants/);
  await expect(row(page, 'SVE-2026-0021')).toContainText(/Délai dépassé de \d+ jours/);
  // Traité : plus de délai affiché
  await expect(row(page, 'SVE-2026-0036')).not.toContainText('restant');
  await expectNoViolations(page);
});

test('filtres : non lus, catégorie, statut, recherche', async ({ page }) => {
  await mockApi(page);
  await page.goto('/messages');
  await page.getByRole('button', { name: 'Non lus', exact: true }).click();
  await expect(page).toHaveURL(/nonLus=true/);
  await expect(inbox(page).getByRole('listitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Non lus', exact: true }).click();

  await page.getByRole('button', { name: 'Catégorie' }).click();
  await page.getByRole('menuitemradio', { name: 'RGPD' }).click();
  await expect(inbox(page).getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Retirer le filtre Catégorie : RGPD' }).click();

  await page.getByRole('button', { name: 'Statut' }).click();
  await page.getByRole('menuitemradio', { name: 'En cours' }).click();
  await expect(inbox(page).getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Retirer le filtre Statut : En cours' }).click();

  await page.getByRole('searchbox', { name: 'Rechercher (nom, objet, référence)' }).fill('SVE-2026-0039');
  await expect(inbox(page).getByRole('listitem')).toHaveCount(1);
  await expect(inbox(page)).toContainText('Karim Benali');
});

test('ouvrir : focus sur l’objet, noté « Ouvert par », compteur mis à jour, bandeau RGPD', async ({ page }) => {
  const { inbox: messages } = await mockApi(page);
  await page.goto('/messages');
  await row(page, 'SVE-2026-0042').click();
  await expect(page).toHaveURL(/id=m-dubois/);
  const title = page.getByRole('heading', { level: 2, name: "Demande d'accès à mes données personnelles" });
  await expect(title).toBeFocused();
  await expect(page.getByRole('alert').filter({ hasText: 'Demande RGPD' })).toContainText(
    /réponse obligatoire avant le \d+ \p{L}+ \(délai légal d'un mois\)\. \d+ jours restants\./u,
  );
  await expect(page.getByRole('region', { name: 'Historique' })).toContainText('Ouvert par Sophie Leroy');
  await expect(page.getByRole('list', { name: 'Pièces jointes' })).toContainText('piece-identite.pdf');
  expect(messages.find((item) => item.documentId === 'm-dubois')!.opened_at).toBeTruthy();
  if (!isMobile(page)) {
    await expect(page.getByRole('region', { name: 'Messages' }).getByText('2 non lus')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Messages \(?2 non lus/ }).first()).toBeAttached();
    await expect(row(page, 'SVE-2026-0042')).not.toContainText('(non lu)');
  }
  await expectNoViolations(page);
});

test('statut : changé, noté dans l’historique', async ({ page }) => {
  const { inbox: messages } = await mockApi(page);
  await page.goto('/messages?id=m-petit');
  await page.getByRole('combobox', { name: 'Statut du message' }).locator('visible=true').selectOption('in_progress');
  await expect(page.getByRole('status').filter({ hasText: 'Statut : En cours.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Historique' })).toContainText(
    'Statut changé de « Reçu » en « En cours » par Sophie Leroy',
  );
  expect(messages.find((item) => item.documentId === 'm-petit')!.status).toBe('in_progress');
});

test('réponse : vide refusée, modèle RGPD à compléter, pièce jointe, envoyée et conservée', async ({ page }) => {
  const { inbox: messages, posts } = await mockApi(page);
  await page.goto('/messages?id=m-dubois');
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  let form = await replyForm(page);
  await form.getByRole('button', { name: 'Envoyer' }).click();
  await expect(form.getByText('Écrivez votre réponse avant de l’envoyer.')).toBeVisible();
  await expect(form.getByRole('textbox')).toBeFocused();

  // Le modèle : proposé depuis le bandeau, à compléter avant l'envoi
  if (isMobile(page)) await page.getByRole('button', { name: /^Fermer/ }).click();
  await page.getByRole('button', { name: 'Modèle de réponse' }).click();
  form = page.getByRole('form', { name: /^Répondre à/ }).locator('visible=true');
  await expect(form.getByRole('textbox')).toHaveValue(/^Bonjour Marc Dubois,/);
  await expect(form.getByText('Écrivez votre réponse')).toHaveCount(0);
  await form.getByRole('button', { name: 'Envoyer' }).click();
  await expect(form.getByText('Complétez le modèle')).toBeVisible();
  expect(posts['/api/contact-submissions/m-dubois/reply'] ?? []).toHaveLength(0);

  const text = (await form.getByRole('textbox').inputValue()).replace(/\[[^\]]+\]/, "l'export de vos données");
  await form.getByRole('textbox').fill(text);
  await form
    .locator('input[type=file]')
    .setInputFiles({ name: 'export.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') });
  await expect(form.getByRole('button', { name: 'Retirer export.pdf' })).toBeVisible();
  await expect(form.getByRole('checkbox', { name: 'Marquer comme traité' })).toBeChecked();
  await expectNoViolations(page);
  await form.getByRole('button', { name: 'Envoyer' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Réponse envoyée à marc.dubois@example.fr.' })).toBeVisible();
  expect(posts['/api/contact-submissions/m-dubois/reply']).toEqual([
    { message: text, resolve: true, attachmentFileId: 1001 },
  ]);
  expect(messages.find((item) => item.documentId === 'm-dubois')!.status).toBe('resolved');
  const history = page.getByRole('region', { name: 'Historique' });
  await expect(history).toContainText('Réponse envoyée par Sophie Leroy');
  await expect(history).toContainText("l'export de vos données");
  // Traitée : plus de bandeau RGPD, le champ est vide
  await expect(page.getByRole('alert').filter({ hasText: 'Demande RGPD' })).toHaveCount(0);
  if (!isMobile(page))
    await expect(
      page
        .getByRole('form', { name: /^Répondre à/ })
        .locator('visible=true')
        .getByRole('textbox'),
    ).toHaveValue('');
});

test('échec d’envoi : annoncé, le texte reste', async ({ page }) => {
  await mockApi(page, { failReply: true });
  await page.goto('/messages?id=m-petit');
  await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
  const form = await replyForm(page);
  await form.getByRole('textbox').fill('Les services interviendront lundi.');
  await form.getByRole('checkbox', { name: 'Marquer comme traité' }).uncheck();
  await form.getByRole('button', { name: 'Envoyer' }).click();
  await expect(page.getByRole('alert').filter({ hasText: "La réponse n'est pas partie" })).toBeVisible();
  await expect(form.getByRole('textbox')).toHaveValue('Les services interviendront lundi.');
});

test('mobile : liste plein écran, détail, retour', async ({ page }) => {
  test.skip(!isMobile(page), 'sous 1024 px');
  await mockApi(page);
  await page.goto('/messages');
  await row(page, 'SVE-2026-0041').click();
  await expect(inbox(page)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Répondre', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Retour aux messages' }).click();
  await expect(inbox(page)).toBeVisible();
  await expect(page).not.toHaveURL(/id=/);
});

test('supprimer un message : confirmation, retour à la liste', async ({ page }) => {
  const { inbox: messages } = await mockApi(page);
  await page.goto('/messages?id=m-benali');
  await page
    .getByRole('button', { name: 'Autres actions pour le message SVE-2026-0039' })
    .locator('visible=true')
    .click();
  await page.getByRole('menuitem', { name: 'Supprimer le message…' }).click();
  await page
    .getByRole('alertdialog', { name: 'Supprimer le message SVE-2026-0039 ?' })
    .getByRole('button', { name: 'Supprimer' })
    .click();
  await expect(page.getByRole('status').filter({ hasText: 'Le message SVE-2026-0039 a été supprimé.' })).toBeVisible();
  await expect(page).not.toHaveURL(/id=/);
  expect(messages.map((item) => item.documentId)).not.toContain('m-benali');
});

test('aucun message : explication', async ({ page }) => {
  await mockApi(page, { messageSet: 'none' });
  await page.goto('/messages');
  await expect(page.getByRole('heading', { level: 2, name: "Aucun message pour l'instant" })).toBeVisible();
  await expectNoViolations(page);
});
