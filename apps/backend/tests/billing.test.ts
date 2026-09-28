/**
 * Facturation intégrée (#314) : facture émise au passage en live (devis accepté), numérotée sans trou,
 * PDF archivé et envoyé ; accès de la commune et de l'équipe ; paiement, dépôt Chorus Pro, relances,
 * avoir, renouvellement annuel et son arrêt.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { addCalendarDays, addDays, parisDay } from '@communeo/core';
import { processBilling } from '../src/services/billing';
import { sha256 } from '../src/services/quote-pdf';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let geo: http.Server;
let admin: string;
let editor: string;
let adminB: string;
let superAdmin: string;
let siteA: string;
let invoiceId: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const SITE = 'api::site.site';
const INVOICE = 'api::invoice.invoice';
const today = parisDay();
const year = today.slice(0, 4);
const pdfBody = (res: any, done: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

async function createUser(email: string, role: 'admin' | 'editor', siteDocumentId: string) {
  const authenticated = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const site = await strapi.db.query(SITE).findOne({ where: { documentId: siteDocumentId } });
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: email, email, password, municipality_role: role, blocked: false, active: true, confirmed: true, provider: 'local', role: authenticated.id, site: site.id },
  });
  return (await api.post('/api/auth/local').send({ identifier: email, password: 'jardin-loire-2026' })).body.jwt as string;
}

beforeAll(async () => {
  geo = http.createServer((req, res) => {
    const code = /^\/geo\/communes\/([^/?]+)/.exec(req.url ?? '')?.[1];
    res.writeHead(code === '58236' ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(code === '58236' ? { population: 1234 } : { code: 404 }));
  });
  await new Promise<void>((resolve) => geo.listen(0, '127.0.0.1', resolve));
  process.env.GEO_API_URL = `http://127.0.0.1:${(geo.address() as AddressInfo).port}/geo`;
  process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';
  Object.assign(process.env, {
    COMMUNEO_LEGAL_NAME: 'Communeo (EI)',
    COMMUNEO_LEGAL_ADDRESS: '12 rue de l’Exemple, 58000 Nevers',
    COMMUNEO_SIRET: '91159276400011',
    COMMUNEO_BILLING_EMAIL: 'facturation@communeo.test',
    COMMUNEO_IBAN: 'FR7630006000011234567890189',
    COMMUNEO_BIC: 'AGRIFRPP',
  });

  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  admin = (await api.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await api.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  siteA = (await api.get('/api/users/me').set(auth(admin))).body.site.documentId;
  await strapi.db.query(SITE).update({ where: { documentId: siteA }, data: { code_insee: '58236', plan: 'trial', trial_ends_at: addDays(new Date(), 12) } });
  editor = await createUser('redac@a.test', 'editor', siteA);
  const siteB = (await strapi.documents(SITE).create({ data: { name: 'Commune B', slug: 'commune-b-factures', contact_mail: 'mairie@b.test' } as any })).documentId;
  adminB = await createUser('admin@b.test', 'admin', siteB);
});

afterAll(async () => {
  await teardownStrapi();
  geo.close();
  delete process.env.GEO_API_URL;
  delete process.env.SIGNUP_NOTIFY_EMAIL;
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('émission au passage en live', () => {
  it('le devis accepté devient la première facture : numéro, échéance à 30 jours, période de 12 mois', async () => {
    const signed = await api.post('/api/quote/sign').set(auth(admin)).send({
      siret: '21750001600019',
      address: '1 place de la Mairie, 58300 Saint-Aubin',
      billingEmail: 'compta@mairie.test',
      signatoryName: 'Marie Durand',
      signatoryRole: 'Maire',
      accept: true,
    });
    expect(signed.status).toBe(200);
    sentEmails.length = 0;

    const approved = await api.post(`/api/validations/live/${siteA}/approve`).set(auth(superAdmin));
    expect(approved.status).toBe(200);

    const invoice: any = await strapi.db.query(INVOICE).findOne({ where: { site: { documentId: siteA } }, populate: ['quote'] });
    invoiceId = invoice.documentId;
    expect(invoice).toMatchObject({ number: `FAC-${year}-0001`, kind: 'invoice', reason: 'go_live', status: 'issued', customer_email: 'compta@mairie.test', customer_siret: '21750001600019' });
    expect(invoice.quote.number).toBe(signed.body.data.number);
    expect(String(invoice.due_at).slice(0, 10)).toBe(addCalendarDays(today, 30));
    expect(String(invoice.period_start).slice(0, 10)).toBe(today);
    expect(Number(invoice.amount_ht)).toBe(signed.body.data.amountHT);
    // PDF figé : son empreinte est gardée
    expect(sha256(Buffer.from(invoice.pdf, 'base64'))).toBe(invoice.pdf_sha256);

    // Envoyée à l'adresse de facturation et aux administrateurs, avec le PDF ; l'équipe doit la déposer
    const sent = sentEmails.filter((mail) => mail.subject.startsWith(`Facture FAC-${year}-0001`));
    expect(sent.map((mail) => mail.to)).toEqual(expect.arrayContaining(['compta@mairie.test', 'test@example.com']));
    // Une adresse n'est servie qu'une fois, même si elle est aussi celle d'un administrateur
    expect(new Set(sent.map((mail) => mail.to)).size).toBe(sent.length);
    expect(sent[0]!.attachments?.[0]?.filename).toBe(`FAC-${year}-0001.pdf`);
    expect(sentEmails.some((mail) => mail.to === 'equipe@communeo.test' && mail.subject.includes('à déposer sur Chorus Pro'))).toBe(true);
  });

  it('pas de seconde facture si la commune repasse par le live', async () => {
    const { issueGoLiveInvoice } = await import('../src/services/billing');
    expect(await issueGoLiveInvoice({ documentId: siteA, name: 'Test Site' })).toBeNull();
    expect(await strapi.db.query(INVOICE).count({ where: { site: { documentId: siteA } } })).toBe(1);
  });
});

describe('accès', () => {
  it('les administrateurs de la commune voient leurs factures et le PDF', async () => {
    const list = await api.get('/api/billing/invoices').set(auth(admin));
    expect(list.status).toBe(200);
    expect(list.body.data.invoices).toHaveLength(1);
    expect(list.body.data.invoices[0]).toMatchObject({ number: `FAC-${year}-0001`, status: 'issued' });
    // Champs internes de l'équipe : absents côté commune
    expect(list.body.data.invoices[0].paymentNote).toBeUndefined();
    expect(list.body.data.renewal).toMatchObject({ enabled: true });

    const pdf = await api.get(`/api/billing/invoices/${invoiceId}/pdf`).set(auth(admin)).buffer(true).parse(pdfBody);
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('ni les rédacteurs, ni une autre commune', async () => {
    expect((await api.get('/api/billing/invoices').set(auth(editor))).status).toBe(403);
    expect((await api.get(`/api/billing/invoices/${invoiceId}/pdf`).set(auth(editor))).status).toBe(404);
    expect((await api.get(`/api/billing/invoices/${invoiceId}/pdf`).set(auth(adminB))).status).toBe(404);
    expect((await api.get('/api/billing/invoices').set(auth(adminB))).body.data.invoices).toEqual([]);
  });

  it("le suivi et les actions sont réservés à l'équipe", async () => {
    expect((await api.get('/api/billing/team').set(auth(admin))).status).toBe(403);
    expect((await api.post(`/api/billing/team/invoices/${invoiceId}/paid`).set(auth(admin)).send({ paidAt: today, amount: 1 })).status).toBe(403);
    const team = await api.get('/api/billing/team').set(auth(superAdmin));
    expect(team.status).toBe(200);
    expect(team.body.data.invoices[0]).toMatchObject({ number: `FAC-${year}-0001`, site: { documentId: siteA } });
    expect(team.body.data.missingSettings).toEqual([]);
  });

  it('une commune ne peut pas arrêter elle-même son renouvellement', async () => {
    await api.put(`/api/sites/${siteA}`).set(auth(admin)).send({ data: { billing_renewal: false } });
    const site: any = await strapi.db.query(SITE).findOne({ where: { documentId: siteA } });
    expect(site.billing_renewal).not.toBe(false);
  });
});

describe('suivi par l’équipe', () => {
  it('dépôt sur Chorus Pro : date et numéro de flux', async () => {
    const res = await api.post(`/api/billing/team/invoices/${invoiceId}/chorus`).set(auth(superAdmin)).send({ depositedAt: today, reference: 'CPP-123456' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ chorusDepositedAt: today, chorusReference: 'CPP-123456' });
    expect((await api.post(`/api/billing/team/invoices/${invoiceId}/chorus`).set(auth(superAdmin)).send({ depositedAt: '2999-01-01' })).status).toBe(400);
  });

  it('relances automatiques après l’échéance, une fois par étape ; la dernière prévient l’équipe', async () => {
    const due = addCalendarDays(today, 30);
    const at = (day: string) => new Date(`${day}T10:00:00+02:00`);
    await processBilling(at(addCalendarDays(due, 3)));
    expect(sentEmails.filter((mail) => mail.subject.startsWith('Rappel'))).toHaveLength(0);

    await processBilling(at(addCalendarDays(due, 8)));
    await processBilling(at(addCalendarDays(due, 9)));
    expect(sentEmails.filter((mail) => mail.subject.startsWith('Rappel') && mail.to === 'compta@mairie.test')).toHaveLength(1);
    expect(sentEmails.some((mail) => mail.to === 'equipe@communeo.test' && mail.subject.startsWith('Facture en retard'))).toBe(false);

    await processBilling(at(addCalendarDays(due, 31)));
    expect(sentEmails.filter((mail) => mail.subject.startsWith('Rappel') && mail.to === 'compta@mairie.test')).toHaveLength(2);
    expect(sentEmails.some((mail) => mail.to === 'equipe@communeo.test' && mail.subject.startsWith('Facture en retard'))).toBe(true);
    const invoice: any = await strapi.db.query(INVOICE).findOne({ where: { documentId: invoiceId } });
    expect(invoice.reminders_sent).toBe(2);
  });

  it('marquée payée à réception du virement ; plus de relance ensuite', async () => {
    expect((await api.post(`/api/billing/team/invoices/${invoiceId}/paid`).set(auth(superAdmin)).send({ paidAt: today, amount: 0 })).status).toBe(400);
    const res = await api.post(`/api/billing/team/invoices/${invoiceId}/paid`).set(auth(superAdmin)).send({ paidAt: today, amount: 390, note: 'Virement DGFiP' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'paid', paidAt: today, paidAmount: 390, paymentNote: 'Virement DGFiP' });
    expect((await api.post(`/api/billing/team/invoices/${invoiceId}/paid`).set(auth(superAdmin)).send({ paidAt: today, amount: 390 })).status).toBe(409);
    expect((await api.post(`/api/billing/team/invoices/${invoiceId}/remind`).set(auth(superAdmin))).status).toBe(409);
  });
});

describe('renouvellement annuel', () => {
  it('à l’échéance : nouvelle facture pour la période suivante, même montant', async () => {
    const first: any = await strapi.db.query(INVOICE).findOne({ where: { documentId: invoiceId } });
    const nextStart = addCalendarDays(String(first.period_end).slice(0, 10), 1);
    await processBilling(new Date(`${String(first.period_end).slice(0, 10)}T10:00:00+02:00`));
    expect(await strapi.db.query(INVOICE).count({ where: { site: { documentId: siteA } } })).toBe(1);

    await processBilling(new Date(`${nextStart}T10:00:00+02:00`));
    const renewal: any = await strapi.db.query(INVOICE).findOne({ where: { site: { documentId: siteA }, reason: 'renewal' } });
    expect(renewal).toMatchObject({ number: `FAC-${nextStart.slice(0, 4)}-${nextStart.slice(0, 4) === year ? '0002' : '0001'}`, status: 'issued' });
    expect(String(renewal.period_start).slice(0, 10)).toBe(nextStart);
    expect(Number(renewal.amount_ht)).toBe(Number(first.amount_ht));
    // Une seule facture par échéance
    await processBilling(new Date(`${nextStart}T12:00:00+02:00`));
    expect(await strapi.db.query(INVOICE).count({ where: { site: { documentId: siteA }, reason: 'renewal' } })).toBe(1);
  });

  it('renouvellement arrêté par l’équipe : plus de facture à l’échéance', async () => {
    const res = await api.put(`/api/billing/team/sites/${siteA}/renewal`).set(auth(superAdmin)).send({ enabled: false });
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
    const last: any = await strapi.db.query(INVOICE).findOne({ where: { site: { documentId: siteA }, reason: 'renewal' } });
    await processBilling(new Date(`${addCalendarDays(String(last.period_end).slice(0, 10), 1)}T10:00:00+02:00`));
    expect(await strapi.db.query(INVOICE).count({ where: { site: { documentId: siteA }, kind: 'invoice' } })).toBe(2);
    await api.put(`/api/billing/team/sites/${siteA}/renewal`).set(auth(superAdmin)).send({ enabled: true });
  });
});

describe('annulation par un avoir', () => {
  it('motif obligatoire ; avoir du même montant, facture annulée mais conservée', async () => {
    const renewal: any = await strapi.db.query(INVOICE).findOne({ where: { site: { documentId: siteA }, reason: 'renewal' } });
    expect((await api.post(`/api/billing/team/invoices/${renewal.documentId}/cancel`).set(auth(superAdmin)).send({ reason: ' ' })).status).toBe(400);
    const res = await api.post(`/api/billing/team/invoices/${renewal.documentId}/cancel`).set(auth(superAdmin)).send({ reason: 'Résiliation notifiée avant l’échéance' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ kind: 'credit_note', creditFor: renewal.number, amountTTC: Number(renewal.amount_ttc) });
    expect(res.body.data.number).toMatch(/^AV-\d{4}-0001$/);

    const cancelled: any = await strapi.db.query(INVOICE).findOne({ where: { documentId: renewal.documentId } });
    expect(cancelled).toMatchObject({ status: 'cancelled', number: renewal.number, pdf_sha256: renewal.pdf_sha256 });
    expect((await api.post(`/api/billing/team/invoices/${renewal.documentId}/cancel`).set(auth(superAdmin)).send({ reason: 'encore' })).status).toBe(409);
  });
});

describe('commune passée en live sans facture', () => {
  it('l’équipe la voit et peut émettre la première facture si un devis a été accepté', async () => {
    const siteC = (await strapi.documents(SITE).create({ data: { name: 'Commune C', slug: 'commune-c-factures', contact_mail: 'mairie@c.test', plan: 'live' } as any })).documentId;
    const team = await api.get('/api/billing/team').set(auth(superAdmin));
    expect(team.body.data.uninvoiced).toContainEqual({ documentId: siteC, name: 'Commune C', hasAcceptedQuote: false });
    const res = await api.post(`/api/billing/team/sites/${siteC}/invoice`).set(auth(superAdmin));
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/devis/);
  });
});

describe('communes antérieures à la facturation', () => {
  it('champ de renouvellement vide (NULL) : la commune est renouvelée comme les autres', async () => {
    await strapi.db.connection('sites').where({ document_id: siteA }).update({ billing_renewal: null });
    const renewals = () => strapi.db.query(INVOICE).count({ where: { site: { documentId: siteA }, reason: 'renewal', status: 'issued' } });
    const before = await renewals();
    await processBilling(new Date(`${addCalendarDays(today, 800)}T10:00:00+02:00`));
    expect(await renewals()).toBe(before + 1);
  });
});
