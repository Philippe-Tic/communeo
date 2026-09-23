/**
 * Collecte des déchets (#141) : fréquences sans jour (apport volontaire, rendez-vous), rang dans le
 * mois, saison ; notes générales du Site.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let jwt: string;
let siteA: string;
const auth = () => ({ Authorization: `Bearer ${jwt}` });
const create = (data: Record<string, unknown>) => http.post('/api/waste-schedules').set(auth()).send({ data: { active: true, ...data } });

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  jwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth())).body.site.documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('collectes', () => {
  it('jour obligatoire pour une collecte régulière', async () => {
    const res = await create({ waste_type: 'ordures-menageres', frequency: 'hebdomadaire' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Choisissez le jour de collecte');
  });

  it('apport volontaire et rendez-vous : sans jour (retiré s’il est envoyé)', async () => {
    const verre = await create({ waste_type: 'verre', frequency: 'apport-volontaire', collection_day: 'lundi', zone: '4 points' });
    expect(verre.status).toBe(201);
    expect(verre.body.data).toMatchObject({ frequency: 'apport-volontaire', collection_day: null });
    expect((await create({ waste_type: 'encombrants', frequency: 'sur-rendez-vous' })).status).toBe(201);
  });

  it('mensuel avec rang, saison complète ; rang retiré hors mensuel', async () => {
    const monthly = await create({ waste_type: 'encombrants', frequency: 'mensuel', collection_day: 'mercredi', month_rank: 1 });
    expect(monthly.body.data).toMatchObject({ month_rank: 1 });
    const weekly = await create({ waste_type: 'dechets-verts', frequency: 'hebdomadaire', collection_day: 'lundi', month_rank: 2, season_start_month: 4, season_end_month: 11 });
    expect(weekly.status).toBe(201);
    expect(weekly.body.data).toMatchObject({ month_rank: null, season_start_month: 4, season_end_month: 11 });
    const half = await create({ waste_type: 'dechets-verts', frequency: 'hebdomadaire', collection_day: 'lundi', season_start_month: 4 });
    expect(half.status).toBe(400);
  });

  it('modification partielle : le reste de la collecte est pris en compte', async () => {
    const id = (await create({ waste_type: 'tri-selectif', frequency: 'semaines-paires', collection_day: 'jeudi' })).body.data.documentId;
    expect((await http.put(`/api/waste-schedules/${id}`).set(auth()).send({ data: { zone: 'Bourg' } })).status).toBe(200);
    const res = await http.put(`/api/waste-schedules/${id}`).set(auth()).send({ data: { frequency: 'sur-rendez-vous' } });
    expect(res.body.data).toMatchObject({ frequency: 'sur-rendez-vous', collection_day: null, zone: 'Bourg' });
  });
});

describe('notes générales', () => {
  it('modifiables par la commune', async () => {
    const res = await http.put(`/api/sites/${siteA}`).set(auth()).send({ data: { waste_notes: 'Déchetterie ouverte du mardi au samedi.' } });
    expect(res.status).toBe(200);
    expect(res.body.data.waste_notes).toBe('Déchetterie ouverte du mardi au samedi.');
  });
});
