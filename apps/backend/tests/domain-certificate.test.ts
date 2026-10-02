/**
 * Certificats à la demande de Caddy pour les domaines nus des communes (#382) : Caddy demande à Strapi
 * (`ask`) avant chaque nouveau certificat. Seul le domaine vérifié d'une commune est accepté : sans ce
 * contrôle, n'importe quel nom pointé vers le serveur ferait demander des certificats à Let's Encrypt.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let api: ReturnType<typeof request>;
let siteId: number;

const check = (domain: string) => api.get('/api/domain/certificate-check').query({ domain });
const setDomain = (data: Record<string, unknown>) => strapi.db.query('api::site.site').update({ where: { id: siteId }, data });

beforeAll(async () => {
  strapi = await setupStrapi();
  api = request(strapi.server.httpServer);
  siteId = (await strapi.db.query('api::site.site').findOne({ where: { slug: 'test-site' } })).id;
});

afterAll(async () => {
  await setDomain({ custom_domain: null, domain_status: 'pending', domain_type: null });
  await teardownStrapi();
});

describe('GET /api/domain/certificate-check', () => {
  it('refuse un domaine inconnu, sans authentification requise', async () => {
    const res = await check('inconnu-de-communeo.fr');
    expect(res.status).toBe(404);
  });

  it("refuse le domaine d'une commune tant qu'il n'est pas vérifié", async () => {
    await setDomain({ custom_domain: 'mairie-test.fr', domain_status: 'pending', domain_type: 'apex' });
    expect((await check('mairie-test.fr')).status).toBe(404);
  });

  it("accepte le domaine nu vérifié d'une commune, quelle que soit la casse", async () => {
    await setDomain({ custom_domain: 'mairie-test.fr', domain_status: 'verified', domain_type: 'apex' });
    const res = await check('mairie-test.fr');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
    expect((await check('Mairie-Test.FR.')).status).toBe(200);
  });

  it('refuse tout le reste : sous-domaine (servi par le CDN), autre domaine, valeur absente ou invalide', async () => {
    await setDomain({ custom_domain: 'mairie-test.fr', domain_status: 'verified', domain_type: 'apex' });
    expect((await check('www.mairie-test.fr')).status).toBe(404);
    expect((await check('autre-mairie.fr')).status).toBe(404);
    expect((await check('')).status).toBe(404);
    expect((await check('mairie-test.fr/../x')).status).toBe(404);
    expect((await api.get('/api/domain/certificate-check')).status).toBe(404);
  });

  it("refuse un sous-domaine vérifié (il pointe vers le CDN, jamais vers le serveur)", async () => {
    await setDomain({ custom_domain: 'www.ville-test.fr', domain_status: 'verified', domain_type: 'subdomain' });
    expect((await check('www.ville-test.fr')).status).toBe(404);
  });
});
