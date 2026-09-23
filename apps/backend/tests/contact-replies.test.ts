/**
 * Messages des habitants (#186) : accusé de réception automatique (échéance RGPD), réponse par
 * e-mail conservée avec pièce jointe de la médiathèque, historique, limité à la commune.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

const UID = 'api::contact-submission.contact-submission';
let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let jwt: string;
let siteA: string;

const auth = () => ({ Authorization: `Bearer ${jwt}` });

/** Message d'un habitant : directement en base (le formulaire public est limité en débit) */
async function message(subject: string, site = siteA) {
  const created = await strapi.documents(UID).create({
    data: { first_name: 'Marc', last_name: 'Dupuis', email: 'marc.dupuis@example.test', subject, message: 'Bonjour', category: 'voirie', status: 'received', reference_number: `SVE-2026-${Math.floor(Math.random() * 9000) + 1000}`, history: [], site } as any,
  });
  return created.documentId;
}

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  jwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth())).body.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('accusé de réception', () => {
  it('envoyé à la réception, avec l’échéance légale pour une demande RGPD', async () => {
    sentEmails.length = 0;
    const res = await http.post('/api/contact-submissions/public').send({
      data: { first_name: 'Léa', last_name: 'Martin', email: 'lea.martin@example.test', subject: 'Accès à mes données', message: 'Je souhaite…', category: 'rgpd', site: siteA },
    });
    expect(res.status).toBe(201);
    const mail = sentEmails.find((sent) => sent.to === 'lea.martin@example.test')!;
    expect(mail.subject).toMatch(/SVE-\d{4}-\d{4}/);
    expect(mail.text).toContain('Accès à mes données');
    expect(mail.text).toMatch(/au plus tard le \d{1,2} \S+ \d{4}/);

    const stored = await strapi.documents(UID).findFirst({ filters: { email: 'lea.martin@example.test' } as any });
    expect(stored).toMatchObject({ acknowledgment_sent: true });
    expect((stored as any).history.map((event: any) => event.type)).toEqual(['received', 'acknowledged']);
  });
});

describe('réponse par e-mail', () => {
  it('message obligatoire ; envoyée, conservée, traitée, dans l’historique', async () => {
    const id = await message('Nid-de-poule rue des Écoles');
    expect((await http.post(`/api/contact-submissions/${id}/reply`).set(auth()).send({ message: ' ' })).status).toBe(400);

    sentEmails.length = 0;
    const text = 'Bonjour,\nLes services techniques interviendront lundi <b>matin</b>.';
    const res = await http.post(`/api/contact-submissions/${id}/reply`).set(auth()).send({ message: text });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'resolved', response: text });
    expect(res.body.data.responded_at).toBeTruthy();
    expect(res.body.data.history.at(-1)).toMatchObject({ type: 'replied', message: text });
    expect(res.body.data.history.at(-1).by).toBeTruthy();

    const mail = sentEmails.at(-1)!;
    expect(mail.to).toBe('marc.dupuis@example.test');
    expect(mail.subject).toMatch(/^Re : Nid-de-poule rue des Écoles \[SVE-/);
    expect(mail.html).toContain('&lt;b&gt;matin&lt;/b&gt;');
    expect(mail.html).toContain('<br>');
  });

  it('sans « traité » : en cours ; échec d’envoi : 502 et rien d’enregistré', async () => {
    const id = await message('Éclairage public');
    const res = await http.post(`/api/contact-submissions/${id}/reply`).set(auth()).send({ message: 'Nous regardons.', resolve: false });
    expect(res.body.data.status).toBe('in_progress');

    const other = await message('Bruit');
    const email = strapi.plugin('email').service('email');
    const send = email.send;
    email.send = async () => {
      throw new Error('Resend indisponible');
    };
    try {
      expect((await http.post(`/api/contact-submissions/${other}/reply`).set(auth()).send({ message: 'Réponse' })).status).toBe(502);
    } finally {
      email.send = send;
    }
    const stored = await strapi.documents(UID).findOne({ documentId: other });
    expect(stored).toMatchObject({ status: 'received', response: null });
  });

  it('pièce jointe : un fichier de la médiathèque de la commune seulement', async () => {
    const upload = await http.post('/api/media-items/upload').set(auth()).attach('files', Buffer.from('%PDF-1.4\n%%EOF\n'), { filename: 'arrete-voirie.pdf', contentType: 'application/pdf' });
    const fileId = upload.body.data.file.id;
    const id = await message('Arrêté de circulation');

    sentEmails.length = 0;
    const res = await http.post(`/api/contact-submissions/${id}/reply`).set(auth()).send({ message: 'Voici l’arrêté.', attachmentFileId: fileId });
    expect(res.status).toBe(200);
    expect(sentEmails.at(-1)!.attachments).toEqual([{ filename: 'arrete-voirie.pdf', content: Buffer.from('%PDF-1.4\n%%EOF\n').toString('base64') }]);
    expect(res.body.data.history.at(-1).attachment).toBe('arrete-voirie.pdf');

    // Fichier d'une autre commune (ou hors médiathèque) : refusé, rien n'est envoyé
    const other = await strapi.documents('api::site.site').create({ data: { name: 'Commune voisine', slug: 'voisine-messages', contact_mail: 'v@example.test' } as any });
    const foreignFile = await strapi.db.query('plugin::upload.file').create({ data: { name: 'secret.pdf', hash: 'secret', ext: '.pdf', mime: 'application/pdf', size: 1, url: '/uploads/secret.pdf', provider: 'local' } });
    await strapi.documents('api::media-item.media-item').create({ data: { name: 'Secret', file: foreignFile.id, site: other.documentId } as any });
    sentEmails.length = 0;
    const refused = await http.post(`/api/contact-submissions/${id}/reply`).set(auth()).send({ message: 'x', attachmentFileId: foreignFile.id });
    expect(refused.status).toBe(400);
    expect(sentEmails).toHaveLength(0);
  });
});

describe('historique', () => {
  it('ouverture notée une fois, changement de statut noté', async () => {
    const id = await message('Poubelles');
    const first = await http.post(`/api/contact-submissions/${id}/open`).set(auth());
    expect(first.body.data.opened_at).toBeTruthy();
    await http.post(`/api/contact-submissions/${id}/open`).set(auth());
    await http.put(`/api/contact-submissions/${id}`).set(auth()).send({ data: { status: 'in_progress' } });
    await http.put(`/api/contact-submissions/${id}`).set(auth()).send({ data: { status: 'in_progress' } });
    const stored = (await strapi.documents(UID).findOne({ documentId: id })) as any;
    expect(stored.history.map((event: any) => event.type)).toEqual(['opened', 'status']);
    expect(stored.history[1]).toMatchObject({ from: 'received', to: 'in_progress' });
  });
});

describe('isolation', () => {
  it("ni le message d'une autre commune, ni sans session", async () => {
    const other = await strapi.documents('api::site.site').create({ data: { name: 'Autre commune', slug: 'autre-messages', contact_mail: 'a@example.test' } as any });
    const foreign = await message('Message voisin', other.documentId);
    sentEmails.length = 0;
    expect([403, 404]).toContain((await http.post(`/api/contact-submissions/${foreign}/reply`).set(auth()).send({ message: 'x' })).status);
    expect([403, 404]).toContain((await http.post(`/api/contact-submissions/${foreign}/open`).set(auth())).status);
    expect(sentEmails).toHaveLength(0);
    expect((await strapi.documents(UID).findOne({ documentId: foreign }))!.status).toBe('received');

    const own = await message('Sans session');
    expect([401, 403]).toContain((await http.post(`/api/contact-submissions/${own}/reply`).send({ message: 'x' })).status);
    expect((await http.post(`/api/contact-submissions/${own}/delete-all`).set(auth())).status).toBe(403);
  });
});
