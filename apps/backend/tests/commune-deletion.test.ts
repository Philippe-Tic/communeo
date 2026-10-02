/**
 * Suppression d'une commune (#391) : demandée par un administrateur de la commune (nom tapé pour
 * confirmer), exécutée 7 jours plus tard, annulable par la mairie ou l'équipe ; rappel la veille ;
 * suppression immédiate par l'équipe ; factures et devis conservés (obligation comptable).
 */
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { addDays } from '@communeo/core';
import { processDeletionRequests } from '../src/services/commune-deletion-request';
import { sentEmails, setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let superAdmin: string;
let adminA: string;
let editorA: string;
let adminC: string;
let siteA: string;
let siteC: string;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const SITE = 'api::site.site';
const site = (documentId: string) => strapi.db.query(SITE).findOne({ where: { documentId } }) as Promise<any>;
const emailsTo = (to: string) => sentEmails.filter((email) => email.to === to);
const activity = (action: string) => strapi.db.query('api::activity-log.activity-log').findMany({ where: { action }, orderBy: { id: 'desc' } }) as Promise<any[]>;

async function createUser(email: string, role: 'admin' | 'editor', siteDocumentId: string) {
  const authenticated = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const target = await site(siteDocumentId);
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: email, email, password, first_name: 'Anne', last_name: 'Maire', municipality_role: role, blocked: false, active: true, confirmed: true, provider: 'local', role: authenticated.id, site: target.id },
  });
  return (await api.post('/api/auth/local').send({ identifier: email, password: 'jardin-loire-2026' })).body.jwt as string;
}

beforeAll(async () => {
  process.env.SIGNUP_NOTIFY_EMAIL = 'equipe@communeo.test';
  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  adminA = (await api.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await api.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  siteA = (await api.get('/api/users/me').set(auth(adminA))).body.site.documentId;
  editorA = await createUser('redac@a.test', 'editor', siteA);
  siteC = (await strapi.documents(SITE).create({ data: { name: 'Saint-Éloi-sur-Seine', slug: 'saint-eloi', contact_mail: 'mairie@c.test' } as any })).documentId;
  adminC = await createUser('admin@c.test', 'admin', siteC);
});

afterAll(async () => {
  await teardownStrapi();
  delete process.env.SIGNUP_NOTIFY_EMAIL;
});

beforeEach(() => {
  sentEmails.length = 0;
});

describe('demande de la commune', () => {
  it('réservée aux administrateurs ; tous les utilisateurs voient l’état', async () => {
    expect((await api.post('/api/commune-deletion/request').set(auth(editorA)).send({ name: 'Test Site' })).status).toBe(403);
    expect((await api.post('/api/commune-deletion/cancel').set(auth(editorA))).status).toBe(403);
    const state = await api.get('/api/commune-deletion').set(auth(editorA));
    expect(state.status).toBe(200);
    expect(state.body.data).toEqual({ scheduledAt: null, paidInvoices: false });
    expect((await api.get('/api/commune-deletion')).status).toBe(403);
  });

  it('refusée sans le nom exact de la commune', async () => {
    const res = await api.post('/api/commune-deletion/request').set(auth(adminC)).send({ name: 'Saint-Eloi' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('« Saint-Éloi-sur-Seine »');
    expect((await site(siteC)).deletion_scheduled_at).toBeNull();
  });

  it('la date ne se pose pas par les réglages du site', async () => {
    await api.put(`/api/sites/${siteC}`).set(auth(adminC)).send({ data: { deletion_scheduled_at: '2026-01-01T00:00:00.000Z' } });
    expect((await site(siteC)).deletion_scheduled_at).toBeNull();
  });

  it('prévue 7 jours plus tard : administrateurs et équipe prévenus, journal', async () => {
    const before = Date.now();
    const res = await api.post('/api/commune-deletion/request').set(auth(adminC)).send({ name: '  saint-éloi-sur-seine ' });
    expect(res.status).toBe(200);
    const scheduledAt = new Date(res.body.data.scheduledAt).getTime();
    expect(scheduledAt).toBeGreaterThanOrEqual(addDays(new Date(before), 7).getTime());
    expect(scheduledAt).toBeLessThan(addDays(new Date(), 7).getTime() + 1000);
    expect(emailsTo('admin@c.test')).toHaveLength(1);
    expect(emailsTo('admin@c.test')[0]!.subject).toMatch(/^Suppression de la commune Saint-Éloi-sur-Seine prévue le/);
    expect(emailsTo('admin@c.test')[0]!.text).toContain('Anne Maire a demandé la suppression');
    expect(emailsTo('equipe@communeo.test')[0]!.subject).toMatch(/^Suppression demandée : Saint-Éloi-sur-Seine/);
    expect((await activity('deletion_request'))[0]).toMatchObject({ target_label: 'Saint-Éloi-sur-Seine', actor_name: 'Anne Maire' });
    // Pendant le délai, rien ne change : l'administration fonctionne
    expect((await api.post('/api/pages').set(auth(adminC)).send({ data: { title: 'Toujours là' } })).status).toBe(201);
  });

  it('une seconde demande garde la date de la première', async () => {
    const first = (await site(siteC)).deletion_scheduled_at;
    await api.post('/api/commune-deletion/request').set(auth(adminC)).send({ name: 'Saint-Éloi-sur-Seine' });
    expect((await site(siteC)).deletion_scheduled_at).toEqual(first);
    expect(sentEmails).toHaveLength(0);
  });

  it('jamais pour une autre commune, même avec l’en-tête d’impersonation', async () => {
    const res = await api.post('/api/commune-deletion/request').set(auth(adminA)).set('X-Site-Document-Id', siteC).send({ name: 'Saint-Éloi-sur-Seine' });
    expect(res.status).toBe(400);
    expect((await site(siteA)).deletion_scheduled_at).toBeNull();
    await api.post('/api/commune-deletion/cancel').set(auth(adminA)).set('X-Site-Document-Id', siteC);
    expect((await site(siteC)).deletion_scheduled_at).not.toBeNull();
  });

  it('annulée par la mairie : commune gardée, administrateurs et équipe prévenus', async () => {
    const res = await api.post('/api/commune-deletion/cancel').set(auth(adminC));
    expect(res.body.data).toEqual({ scheduledAt: null, paidInvoices: false });
    expect((await site(siteC)).deletion_scheduled_at).toBeNull();
    expect(emailsTo('admin@c.test')[0]!.subject).toMatch(/annulée/);
    expect(emailsTo('equipe@communeo.test')[0]!.subject).toBe('Suppression annulée : Saint-Éloi-sur-Seine');
    expect(await activity('deletion_cancel')).toHaveLength(1);
  });

  it('possible pendant un essai terminé (administration en lecture seule)', async () => {
    await strapi.db.query(SITE).update({ where: { documentId: siteC }, data: { plan: 'expired', trial_expired_at: new Date() } });
    expect((await api.post('/api/pages').set(auth(adminC)).send({ data: { title: 'Lecture seule' } })).status).toBe(403);
    expect((await api.post('/api/commune-deletion/request').set(auth(adminC)).send({ name: 'Saint-Éloi-sur-Seine' })).status).toBe(200);
    expect((await api.post('/api/commune-deletion/cancel').set(auth(adminC))).status).toBe(200);
    await strapi.db.query(SITE).update({ where: { documentId: siteC }, data: { plan: 'live', trial_expired_at: null } });
  });
});

describe('équipe Communeo', () => {
  it('voit la date prévue et annule la demande', async () => {
    await api.post('/api/commune-deletion/request').set(auth(adminC)).send({ name: 'Saint-Éloi-sur-Seine' });
    const found = await api.get(`/api/site-management/${siteC}`).set(auth(superAdmin));
    expect(found.body.data.deletionScheduledAt).toBe(new Date((await site(siteC)).deletion_scheduled_at).toISOString());
    sentEmails.length = 0;
    const res = await api.put(`/api/site-management/${siteC}`).set(auth(superAdmin)).send({ data: { cancelDeletion: true } });
    expect(res.body.data.deletionScheduledAt).toBeNull();
    expect(emailsTo('admin@c.test')[0]!.text).toContain("L'équipe Communeo");
  });

  it('demande et annule aussi depuis l’administration de la commune (impersonation)', async () => {
    const res = await api.post('/api/commune-deletion/request').set(auth(superAdmin)).set('X-Site-Document-Id', siteC).send({ name: 'Saint-Éloi-sur-Seine' });
    expect(res.status).toBe(200);
    expect(emailsTo('admin@c.test')[0]!.text).toContain("L'équipe Communeo");
    expect((await api.post('/api/commune-deletion/cancel').set(auth(superAdmin)).set('X-Site-Document-Id', siteC)).status).toBe(200);
    expect((await site(siteC)).deletion_scheduled_at).toBeNull();
  });
});

describe('échéance', () => {
  let quoteId: string;
  let invoiceId: string;

  it('rappel la veille, une seule fois', async () => {
    const now = new Date();
    await strapi.db.query(SITE).update({ where: { documentId: siteC }, data: { deletion_scheduled_at: addDays(now, 3), deletion_reminded: false } });
    await processDeletionRequests(now);
    expect(sentEmails).toHaveLength(0);
    await processDeletionRequests(addDays(now, 2.2));
    expect(emailsTo('admin@c.test')).toHaveLength(1);
    expect(emailsTo('admin@c.test')[0]!.subject).toMatch(/sera supprimée demain/);
    await processDeletionRequests(addDays(now, 2.5));
    expect(emailsTo('admin@c.test')).toHaveLength(1);
  });

  it('supprime la commune à la date prévue ; factures et devis conservés, PDF compris', async () => {
    const quote: any = await strapi.documents('api::quote.quote' as any).create({
      data: {
        site: siteC, number: 'DEV-2026-0099', status: 'accepted', commune_name: 'Saint-Éloi-sur-Seine', siret: '21580236500017', address: '1 place de la Mairie',
        billing_email: 'mairie@c.test', population: 800, tier_label: 'Moins de 1 000 habitants', amount_ht: 300, vat_rate: 0, amount_ttc: 300,
        signatory_name: 'Anne Maire', signatory_role: 'Maire', signed_at: new Date(), pdf: 'cGRm', pdf_sha256: 'abc',
      } as any,
    });
    const invoice: any = await strapi.documents('api::invoice.invoice' as any).create({
      data: {
        site: siteC, quote: quote.documentId, number: 'FAC-2026-0099', kind: 'invoice', reason: 'go_live', status: 'issued', issued_at: '2026-10-01', due_at: '2026-10-31',
        label: 'Abonnement', customer_name: 'Commune de Saint-Éloi-sur-Seine', customer_siret: '21580236500017', customer_address: '1 place de la Mairie',
        customer_email: 'mairie@c.test', amount_ht: 300, vat_rate: 0, amount_ttc: 300, pdf: 'JVBERi0=', pdf_sha256: 'def',
      } as any,
    });
    quoteId = quote.documentId;
    invoiceId = invoice.documentId;
    sentEmails.length = 0;

    const due = new Date((await site(siteC)).deletion_scheduled_at);
    await processDeletionRequests(addDays(due, 0.01));
    expect(await site(siteC)).toBeNull();
    expect(await strapi.db.query('plugin::users-permissions.user').findOne({ where: { email: 'admin@c.test' } })).toBeNull();
    expect(emailsTo('admin@c.test')[0]!.subject).toBe('La commune Saint-Éloi-sur-Seine a été supprimée — Communeo');
    expect(emailsTo('equipe@communeo.test')[0]!.subject).toBe('Commune supprimée : Saint-Éloi-sur-Seine');
    expect((await activity('commune_delete'))[0]).toMatchObject({ target_label: 'Saint-Éloi-sur-Seine', details: { reason: 'requested' } });

    const kept: any = await strapi.db.query('api::invoice.invoice').findOne({ where: { documentId: invoiceId }, populate: ['site'] });
    expect(kept).toMatchObject({ number: 'FAC-2026-0099', customer_name: 'Commune de Saint-Éloi-sur-Seine', pdf: 'JVBERi0=', site: null });
    const keptQuote: any = await strapi.db.query('api::quote.quote').findOne({ where: { documentId: quoteId }, populate: ['site'] });
    expect(keptQuote).toMatchObject({ number: 'DEV-2026-0099', pdf: 'cGRm', site: null });
  });

  it('la facture d’une commune supprimée reste dans le suivi de l’équipe et s’annule par un avoir', async () => {
    const team = await api.get('/api/billing/team').set(auth(superAdmin));
    expect(team.status).toBe(200);
    expect(team.body.data.invoices.find((invoice: any) => invoice.number === 'FAC-2026-0099')).toMatchObject({ site: null });
    const res = await api.post(`/api/billing/team/invoices/${invoiceId}/cancel`).set(auth(superAdmin)).send({ reason: 'Commune supprimée' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ kind: 'credit_note', creditFor: 'FAC-2026-0099', site: null });
    expect(emailsTo('mairie@c.test')[0]!.subject).toMatch(/^Avoir AV-/);
  });

  it('l’équipe supprime une commune tout de suite, demande en cours ou non', async () => {
    const siteD = (await strapi.documents(SITE).create({ data: { name: 'Commune D', slug: 'commune-d', contact_mail: 'mairie@d.test' } as any })).documentId;
    await strapi.db.query(SITE).update({ where: { documentId: siteD }, data: { deletion_scheduled_at: addDays(new Date(), 5) } });
    expect((await api.delete(`/api/site-management/${siteD}`).set(auth(superAdmin))).status).toBe(200);
    expect(await site(siteD)).toBeNull();
  });
});

describe('abonnement payé : pas de suppression', () => {
  let siteE: string;
  let adminE: string;
  let invoiceE: string;

  beforeAll(async () => {
    siteE = (await strapi.documents(SITE).create({ data: { name: 'Commune E', slug: 'commune-e', contact_mail: 'mairie@e.test' } as any })).documentId;
    adminE = await createUser('admin@e.test', 'admin', siteE);
    const invoice: any = await strapi.documents('api::invoice.invoice' as any).create({
      data: {
        site: siteE, number: 'FAC-2026-0201', kind: 'invoice', reason: 'go_live', status: 'issued', issued_at: '2026-10-01', due_at: '2026-10-31', label: 'Abonnement',
        customer_name: 'Commune E', customer_siret: '21580236500017', customer_address: '1 place', customer_email: 'mairie@e.test',
        amount_ht: 300, vat_rate: 0, amount_ttc: 300, pdf: 'JVBERi0=', pdf_sha256: 'e',
      } as any,
    });
    invoiceE = invoice.documentId;
  });

  it('une facture en attente n’empêche pas la demande', async () => {
    expect((await api.get('/api/commune-deletion').set(auth(adminE))).body.data).toEqual({ scheduledAt: null, paidInvoices: false });
  });

  it('payée pendant le délai : rien n’est supprimé à l’échéance, la demande est annulée, l’équipe prévenue', async () => {
    expect((await api.post('/api/commune-deletion/request').set(auth(adminE)).send({ name: 'Commune E' })).status).toBe(200);
    await strapi.db.query('api::invoice.invoice').update({ where: { documentId: invoiceE }, data: { status: 'paid', paid_at: '2026-10-05', paid_amount: 300 } });
    sentEmails.length = 0;
    await processDeletionRequests(addDays(new Date(), 8));
    expect(await site(siteE)).toMatchObject({ deletion_scheduled_at: null });
    expect(emailsTo('equipe@communeo.test')[0]!.subject).toBe('Suppression non faite : Commune E a un abonnement payé');
    expect(emailsTo('admin@e.test')).toHaveLength(0);
    expect((await activity('deletion_cancel'))[0]).toMatchObject({ target_label: 'Commune E', details: { reason: 'paid_invoices' } });
  });

  it('la commune ne peut plus la demander (409 paid_invoices) et le voit dans l’état', async () => {
    expect((await api.get('/api/commune-deletion').set(auth(adminE))).body.data).toEqual({ scheduledAt: null, paidInvoices: true });
    const res = await api.post('/api/commune-deletion/request').set(auth(adminE)).send({ name: 'Commune E' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ message: expect.stringContaining('abonnement payé'), details: { code: 'paid_invoices' } });
    expect((await site(siteE)).deletion_scheduled_at).toBeNull();
  });

  it('l’équipe non plus : fiche signalée, suppression refusée (409)', async () => {
    expect((await api.get(`/api/site-management/${siteE}`).set(auth(superAdmin))).body.data.paidInvoices).toBe(true);
    const res = await api.delete(`/api/site-management/${siteE}`).set(auth(superAdmin));
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ code: 'paid_invoices' });
    expect(await site(siteE)).not.toBeNull();
  });

  it('une facture payée puis annulée par un avoir ne bloque plus', async () => {
    await strapi.db.query('api::invoice.invoice').update({ where: { documentId: invoiceE }, data: { status: 'cancelled' } });
    expect((await api.get('/api/commune-deletion').set(auth(adminE))).body.data.paidInvoices).toBe(false);
  });
});
