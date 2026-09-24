/**
 * Modèles de pages (#153) : pages créées en brouillon, avec les coordonnées de la mairie, ajoutées
 * au sous-menu « Vie pratique », sans doublon ; l'historique dit de quel modèle vient la page.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let admin: string;
let siteA: string;

const auth = () => ({ Authorization: `Bearer ${admin}` });

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  admin = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth())).body.site.documentId;
  await strapi.documents('api::site.site').update({
    documentId: siteA,
    data: { contact_mail: 'mairie@a.test', contact_phone: '03 86 00 00 00', navigation_config: { main: [], footer: [] } } as any,
  });
});

afterAll(async () => {
  await teardownStrapi();
});

describe('modèles de pages', () => {
  it('liste des cinq modèles, aucun encore utilisé', async () => {
    const { data } = (await http.get('/api/page-templates').set(auth())).body;
    expect(data).toHaveLength(5);
    expect(data.every((template: any) => template.page === null)).toBe(true);
    expect(data.filter((template: any) => template.suggested)).toHaveLength(4);
  });

  it('création en brouillon, coordonnées de la mairie, sous-menu « Vie pratique »', async () => {
    const res = await http
      .post('/api/page-templates')
      .set(auth())
      .send({ templates: ['salle-des-fetes', 'contact-services'], menu: true });
    expect(res.status).toBe(200);
    expect(res.body.data.map((page: any) => page.title)).toEqual(['Location de la salle des fêtes', 'Contacter les services']);
    expect(res.body.meta.notInMenu).toEqual([]);

    const [salle, contact] = res.body.data;
    // Brouillon : rien n'est publié
    expect((await http.get(`/api/pages/${salle.documentId}?status=published`).set(auth())).status).toBe(404);
    const draft = (await http.get(`/api/pages/${contact.documentId}?status=draft&populate[blocks][populate]=*`).set(auth())).body.data;
    expect(draft.blocks[1]).toMatchObject({ __component: 'blocks.contact', email: 'mairie@a.test', phone: '03 86 00 00 00' });
    expect(draft.slug).toBe('contacter-les-services');

    const site: any = await strapi.documents('api::site.site').findOne({ documentId: siteA });
    expect(site.navigation_config.main).toEqual([
      {
        type: 'group',
        label: 'Vie pratique',
        children: [
          { type: 'page', pageDocumentId: salle.documentId },
          { type: 'page', pageDocumentId: contact.documentId },
        ],
      },
    ]);
  });

  it('pas de doublon : un modèle déjà utilisé est signalé et n’est pas recréé', async () => {
    const again = await http.post('/api/page-templates').set(auth()).send({ templates: ['salle-des-fetes', 'urbanisme'] });
    expect(again.body.data.map((page: any) => page.template)).toEqual(['urbanisme']);
    const { data } = (await http.get('/api/page-templates').set(auth())).body;
    expect(data.find((template: any) => template.id === 'salle-des-fetes').page.title).toBe('Location de la salle des fêtes');
  });

  it('l’historique dit de quel modèle vient la page', async () => {
    const { data } = (await http.get('/api/page-templates').set(auth())).body;
    const page = data.find((template: any) => template.id === 'urbanisme').page;
    const history = (await http.get(`/api/content-versions/pages/${page.documentId}`).set(auth())).body;
    expect(history.meta.template).toBe('Urbanisme');
  });

  it('modèle inconnu : refusé ; sans session : refusé', async () => {
    expect((await http.post('/api/page-templates').set(auth()).send({ templates: ['piscine'] })).status).toBe(400);
    expect((await http.post('/api/page-templates').send({ templates: ['urbanisme'] })).status).toBeGreaterThanOrEqual(401);
  });
});
