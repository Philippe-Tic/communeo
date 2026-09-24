/**
 * Assistant de création (#150) : recherche d'une commune et pré-remplissage depuis les données
 * publiques (geo.api.gouv.fr, Annuaire de l'administration), simulées par un serveur local ;
 * progression de l'assistant posée à la création d'une commune, sans mise en ligne.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let admin: string;
let superAdmin: string;
let editor: string;
let publicData: http.Server;
let annuaireDown = false;
let geoDown = false;

const GEO_RECORD = {
  nom: 'Saint-Pierre-le-Moûtier',
  code: '58264',
  codesPostaux: ['58240'],
  population: 1823,
  centre: { type: 'Point', coordinates: [3.1374, 46.7915] },
  departement: { code: '58', nom: 'Nièvre' },
};
const HALLS = [
  { nom: 'Mairie déléguée - Hameau', siret: '21580264600099' },
  {
    nom: 'Mairie - Saint-Pierre-le-Moûtier',
    adresse: [{ type_adresse: 'Adresse', numero_voie: "33 place de l'Église", code_postal: '58240', nom_commune: 'Saint-Pierre-le-Moûtier' }],
    telephone: [{ valeur: '03 86 90 19 94' }],
    adresse_courriel: 'mairie@saintpierrelemoutier.fr',
    siret: '21580264600012',
    plage_ouverture: [{ nom_jour_debut: 'Lundi', nom_jour_fin: 'Vendredi', valeur_heure_debut_1: '09:00:00', valeur_heure_fin_1: '12:00:00' }],
  },
];

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  // Données publiques simulées
  publicData = http.createServer((req, res) => {
    const url = new URL(req.url!, 'http://localhost');
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname.startsWith('/geo')) {
      if (geoDown) return send(503, {});
      if (url.pathname === '/geo/communes')
        return send(200, url.searchParams.get('nom')?.startsWith('Saint-Pierre') || url.searchParams.get('codePostal') === '58240' ? [GEO_RECORD] : []);
      if (url.pathname === '/geo/communes/58264') return send(200, GEO_RECORD);
      return send(404, { code: 404 });
    }
    if (url.pathname === '/annuaire') return annuaireDown ? send(500, {}) : send(200, { total_count: 2, results: HALLS });
    send(404, {});
  });
  await new Promise<void>((resolve) => publicData.listen(0, resolve));
  const port = (publicData.address() as AddressInfo).port;
  process.env.GEO_API_URL = `http://127.0.0.1:${port}/geo`;
  process.env.ANNUAIRE_API_URL = `http://127.0.0.1:${port}/annuaire`;

  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  admin = (await api.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  superAdmin = (await api.post('/api/auth/local').send({ identifier: 'super@example.com', password: 'super123' })).body.jwt;
  const me = (await api.get('/api/users/me').set(auth(admin))).body;
  const site = await strapi.db.query('api::site.site').findOne({ where: { documentId: me.site.documentId } });
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  const password = (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password: 'jardin-loire-2026' })).password;
  await strapi.db.query('plugin::users-permissions.user').create({
    data: { username: 'redac@onb.test', email: 'redac@onb.test', password, municipality_role: 'editor', blocked: false, active: true, confirmed: true, provider: 'local', role: role.id, site: site.id },
  });
  editor = (await api.post('/api/auth/local').send({ identifier: 'redac@onb.test', password: 'jardin-loire-2026' })).body.jwt;
});

afterAll(async () => {
  await teardownStrapi();
  publicData.close();
  delete process.env.GEO_API_URL;
  delete process.env.ANNUAIRE_API_URL;
});

describe('progression de l’assistant', () => {
  it('posée à la création d’une commune, enregistrée sans mise en ligne en attente', async () => {
    const created = await api.post('/api/site-management').set(auth(superAdmin)).send({
      data: { name: 'Nouvelle commune', slug: 'nouvelle-commune-assistant', admin_email: 'maire@nouvelle.test', admin_first_name: 'Anne', admin_last_name: 'Maire' },
    });
    const documentId = created.body.data.documentId;
    const site = await strapi.documents('api::site.site').findOne({ documentId });
    expect((site as any).onboarding).toEqual({ step: 1 });
    await strapi.documents('api::site.site').update({ documentId, data: { onboarding: { step: 3 } } as any });
    expect(await strapi.query('api::pending-change.pending-change').count({ where: { site: { documentId } } })).toBe(0);
  });
});

describe('recherche d’une commune', () => {
  it('par nom ou par code postal', async () => {
    const byName = await api.get('/api/onboarding/communes?q=Saint-Pierre').set(auth(admin));
    expect(byName.body.data).toEqual([
      { name: 'Saint-Pierre-le-Moûtier', insee: '58264', postalCodes: ['58240'], population: 1823, department: 'Nièvre' },
    ]);
    expect((await api.get('/api/onboarding/communes?q=58240').set(auth(admin))).body.data).toHaveLength(1);
    expect((await api.get('/api/onboarding/communes?q=x').set(auth(admin))).body.data).toEqual([]);
  });

  it('réservée aux administrateurs', async () => {
    expect((await api.get('/api/onboarding/communes?q=Saint').set(auth(editor))).status).toBe(403);
    expect((await api.get('/api/onboarding/communes?q=Saint')).status).toBeGreaterThanOrEqual(401);
  });
});

describe('pré-remplissage', () => {
  it('population, coordonnées et mairie (la principale, pas une mairie déléguée), SIRET et horaires', async () => {
    const { data } = (await api.get('/api/onboarding/communes/58264').set(auth(admin))).body;
    expect(data).toMatchObject({ insee: '58264', population: 1823, latitude: 46.7915, longitude: 3.1374 });
    expect(data.townHall).toMatchObject({
      address: "33 place de l'Église, 58240 Saint-Pierre-le-Moûtier",
      phone: '03 86 90 19 94',
      email: 'mairie@saintpierrelemoutier.fr',
      siret: '21580264600012',
    });
    expect(data.townHall.hours.days.wednesday).toEqual([{ open: '09:00', close: '12:00' }]);
  });

  it('Annuaire en panne : le reste arrive quand même ; geo en panne : 502 explicite', async () => {
    annuaireDown = true;
    const partial = await api.get('/api/onboarding/communes/58264').set(auth(admin));
    annuaireDown = false;
    expect(partial.status).toBe(200);
    expect(partial.body.data).toMatchObject({ population: 1823, townHall: null });
    geoDown = true;
    const down = await api.get('/api/onboarding/communes/58264').set(auth(admin));
    geoDown = false;
    expect(down.status).toBe(502);
    expect(down.body.error.message).toMatch(/renseignez les informations à la main/);
  });

  it('code INSEE inconnu ou invalide : introuvable', async () => {
    expect((await api.get('/api/onboarding/communes/99999').set(auth(admin))).status).toBe(404);
    expect((await api.get('/api/onboarding/communes/abc').set(auth(admin))).status).toBe(404);
  });
});
