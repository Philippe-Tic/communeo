/**
 * Réglages du Site (#143) : hébergeur des mentions légales fixé par la plateforme (jamais par la
 * commune), aligné au démarrage ; horaires refusés quand deux plages se chevauchent.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { syncHosting } from '../src/services/hosting';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let jwt: string;
let site: string;

const auth = () => ({ Authorization: `Bearer ${jwt}` });
const HOST = { name: 'Hébergeur de la plateforme', address: '1 rue du Serveur, 75000 Paris', phone: '01 00 00 00 00' };
const legalOf = async () =>
  (await strapi.documents('api::site.site').findOne({ documentId: site, populate: ['mentions_legales'] }))?.mentions_legales as Record<string, unknown>;

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  jwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  site = (await http.get('/api/users/me').set(auth())).body.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('hébergeur des mentions légales', () => {
  it('sans configuration : celui déjà enregistré est conservé, pas celui envoyé', async () => {
    strapi.config.set('platform.host', { name: '', address: '', phone: '' });
    // Valeur antérieure à la configuration (le document service, lui, ne laisse rien écrire)
    await strapi.documents('api::site.site').update({ documentId: site, data: { mentions_legales: { siret: '215 803 205 00017' } } as any });
    const { id } = (await legalOf()) as { id: number };
    await strapi.db.query('legal.mentions-legales').update({ where: { id }, data: { hebergeur_name: 'Ancien hébergeur' } });
    const res = await http
      .put(`/api/sites/${site}`)
      .set(auth())
      .send({ data: { mentions_legales: { publication_director: 'Claire Martin', hebergeur_name: 'Pirate' } } });
    expect(res.status).toBe(200);
    expect(await legalOf()).toMatchObject({ publication_director: 'Claire Martin', hebergeur_name: 'Ancien hébergeur' });
  });

  it('configuré : imposé à chaque enregistrement et aligné au démarrage', async () => {
    strapi.config.set('platform.host', HOST);
    await http.put(`/api/sites/${site}`).set(auth()).send({ data: { mentions_legales: { publication_director: 'Claire Martin' } } });
    expect(await legalOf()).toMatchObject({ hebergeur_name: HOST.name, hebergeur_address: HOST.address, hebergeur_phone: HOST.phone });

    // Composant modifié hors document service (ancienne donnée) : réaligné au démarrage
    const { id } = (await legalOf()) as { id: number };
    await strapi.db.query('legal.mentions-legales').update({ where: { id }, data: { hebergeur_name: 'Autre' } });
    await syncHosting(strapi);
    expect(await legalOf()).toMatchObject({ hebergeur_name: HOST.name, publication_director: 'Claire Martin' });
  });
});

describe('thème', () => {
  it('seul un thème construit peut être choisi', async () => {
    const unbuilt = await http.put(`/api/sites/${site}`).set(auth()).send({ data: { theme: 'journal' } });
    expect(unbuilt.status).toBe(400);
    expect(unbuilt.body.error.details.errors[0]).toMatchObject({ path: ['theme'], message: "Ce thème n'est pas encore disponible" });
    expect((await http.put(`/api/sites/${site}`).set(auth()).send({ data: { theme: 'institutionnel' } })).status).toBe(200);
  });
});

describe('horaires', () => {
  it('deux plages qui se chevauchent sont refusées', async () => {
    const days = { monday: [{ open: '09:00', close: '12:00' }, { open: '11:00', close: '17:00' }], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
    const res = await http.put(`/api/sites/${site}`).set(auth()).send({ data: { infos_pratiques: { opening_hours: { days, closures: [] } } } });
    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0]).toMatchObject({ path: ['infos_pratiques', 'opening_hours', 'days', 'monday', 1], message: 'Deux plages se chevauchent' });
  });

  it('une fermeture sur une période est acceptée', async () => {
    const days = { monday: [{ open: '09:00', close: '12:00' }], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
    const closures = [{ date: '2026-12-24', end: '2027-01-02', label: 'Congés' }];
    const res = await http.put(`/api/sites/${site}`).set(auth()).send({ data: { infos_pratiques: { opening_hours: { days, closures } } } });
    expect(res.status).toBe(200);
  });
});
