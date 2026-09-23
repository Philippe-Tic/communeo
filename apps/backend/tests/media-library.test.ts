/**
 * Médiathèque V2 (#189) : contrôle des fichiers envoyés (extension, signature, SVG nettoyé),
 * texte alternatif / légende / crédit portés par le fichier et repris partout, dossiers, index des
 * usages, suppression refusée d'un fichier utilisé, fichiers d'une autre commune refusés.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let http: ReturnType<typeof request>;
let jwt: string;
let siteA: string;
let siteB: string;

const auth = () => ({ Authorization: `Bearer ${jwt}` });
// PNG 1 × 1 valide (traité par sharp)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const upload = (buffer: Buffer, filename: string, contentType: string, fields: Record<string, string> = {}) => {
  let req = http.post('/api/media-items/upload').set(auth());
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  return req.attach('files', buffer, { filename, contentType });
};

beforeAll(async () => {
  strapi = await setupStrapi();
  http = request(strapi.server.httpServer);
  jwt = (await http.post('/api/auth/local').send({ identifier: 'test@example.com', password: 'test123' })).body.jwt;
  siteA = (await http.get('/api/users/me').set(auth())).body.site.documentId;
  siteB = (await strapi.documents('api::site.site').create({ data: { name: 'Commune B', slug: 'commune-b-media', contact_mail: 'b@example.test' } as any })).documentId;
});

afterAll(async () => {
  await teardownStrapi();
});

describe('envoi', () => {
  it('image : fiche de la commune, dossier, auteur, texte alternatif sur le fichier', async () => {
    const res = await upload(PNG, 'salle.png', 'image/png', { folder: 'Bâtiments', alt_text: 'Façade de la salle des fêtes', credit: 'Mairie' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ folder: 'Bâtiments', uploaded_by_name: expect.any(String), site: { documentId: siteA } });
    expect(res.body.data.file).toMatchObject({ mime: 'image/png', alternativeText: 'Façade de la salle des fêtes', credit: 'Mairie' });
  });

  it('type déclaré contredit par l’extension ou par le contenu : refusé', async () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>');
    const badExtension = await upload(html, 'page.html', 'image/png');
    expect(badExtension.status).toBe(400);
    expect(badExtension.body.error.message).toContain("L'extension du fichier ne correspond pas");
    const badContent = await upload(html, 'photo.png', 'image/png');
    expect(badContent.status).toBe(400);
    expect(badContent.body.error.message).toBe('Le contenu du fichier ne correspond pas à un fichier PNG.');
  });

  it('SVG : scripts, événements et liens externes retirés ; faux SVG refusé', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><a href="javascript:alert(3)"><circle cx="5" cy="5" r="4"/></a><image href="https://pirate.example/x.png"/><foreignObject><div>x</div></foreignObject></svg>';
    const res = await upload(Buffer.from(svg), 'blason.svg', 'image/svg+xml');
    expect(res.status).toBe(201);
    const stored = readFileSync(join(strapi.dirs.static.public, res.body.data.file.url), 'utf8');
    expect(stored).toContain('<circle');
    for (const forbidden of ['onload', '<script', 'javascript:', 'pirate.example', 'foreignObject']) expect(stored).not.toContain(forbidden);

    const notSvg = await upload(Buffer.from('<html><body>x</body></html>'), 'logo.svg', 'image/svg+xml');
    expect(notSvg.status).toBe(400);
  });
});

describe('texte du fichier, usages, suppression', () => {
  it('le texte alternatif modifié est repris par les contenus ; usages ; suppression refusée', async () => {
    const media = (await upload(PNG, 'mairie.png', 'image/png', { folder: 'Bâtiments' })).body.data;
    const page = await http
      .post('/api/pages')
      .set(auth())
      .send({ data: { title: 'Location de la salle', blocks: [{ __component: 'blocks.image', image: media.file.id }] } });
    expect(page.status).toBe(201);

    const edit = await http.put(`/api/media-items/${media.documentId}`).set(auth()).send({ data: { name: 'mairie-place.jpg', alt_text: 'La mairie vue de la place', caption: 'Mairie', credit: 'J. Martin', folder: 'Patrimoine' } });
    expect(edit.status).toBe(200);
    // Renommer la fiche renomme le fichier (nom montré par les blocs et le site public)
    expect(edit.body.data).toMatchObject({ name: 'mairie-place.jpg', folder: 'Patrimoine', file: { name: 'mairie-place.jpg', alternativeText: 'La mairie vue de la place', caption: 'Mairie', credit: 'J. Martin' } });

    // Le contenu lit le fichier : texte alternatif à jour sans toucher la page
    const read = await http.get(`/api/pages/${page.body.data.documentId}?status=draft&populate[blocks][populate]=*`).set(auth());
    expect(read.body.data.blocks[0].image).toMatchObject({ alternativeText: 'La mairie vue de la place', credit: 'J. Martin' });

    const usage = await http.get(`/api/media-items/usage?file=${media.file.id}`).set(auth());
    expect(usage.body.data).toEqual([{ uid: 'api::page.page', documentId: page.body.data.documentId, label: 'Page — Location de la salle', path: `/pages/${page.body.data.documentId}` }]);

    const remove = await http.delete(`/api/media-items/${media.documentId}`).set(auth());
    expect(remove.status).toBe(409);
    expect(remove.body.error.message).toBe('Ce fichier est utilisé dans 1 contenu : retirez-le d\'abord.');
  });

  it('fichier inutilisé : fiche et fichier supprimés', async () => {
    const sent = await upload(PNG, 'inutile.png', 'image/png');
    expect(sent.status, JSON.stringify(sent.body)).toBe(201);
    const media = sent.body.data;
    const removed = await http.delete(`/api/media-items/${media.documentId}`).set(auth());
    expect(removed.status, JSON.stringify(removed.body)).toBe(204);
    expect(await strapi.db.query('plugin::upload.file').findOne({ where: { id: media.file.id } })).toBeNull();
  });

  it('dossiers et compteurs : total, sans texte alternatif, par dossier', async () => {
    const res = await http.get('/api/media-items/folders').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
    expect(res.body.data.missingAlt).toBeGreaterThanOrEqual(1);
    expect(res.body.data.folders).toEqual(expect.arrayContaining([{ name: 'Bâtiments', count: 1 }, { name: 'Patrimoine', count: 1 }]));
  });
});

describe('fichiers d’une autre commune', () => {
  it('refusés dans un contenu, même dans un bloc ; ceux de la commune acceptés', async () => {
    const foreignFile = await strapi.db.query('plugin::upload.file').create({ data: { name: 'b.png', hash: 'b-secret', ext: '.png', mime: 'image/png', size: 1, url: '/uploads/b.png', provider: 'local' } });
    await strapi.documents('api::media-item.media-item').create({ data: { name: 'B', file: foreignFile.id, site: siteB } as any });

    const inBlock = await http.post('/api/pages').set(auth()).send({ data: { title: 'Page pirate', blocks: [{ __component: 'blocks.image', image: foreignFile.id }] } });
    expect(inBlock.status).toBe(400);
    expect(inBlock.body.error.message).toBe('Fichier introuvable dans la médiathèque de la commune');
    const photo = await http.post('/api/team-members').set(auth()).send({ data: { first_name: 'A', last_name: 'B', role: 'conseiller', photo: foreignFile.id } });
    expect(photo.status).toBe(400);
    const logo = await http.put(`/api/sites/${siteA}`).set(auth()).send({ data: { logo: foreignFile.id } });
    expect(logo.status).toBe(400);

    const own = (await upload(PNG, 'elu.png', 'image/png')).body.data;
    expect((await http.post('/api/team-members').set(auth()).send({ data: { first_name: 'C', last_name: 'D', role: 'conseiller', photo: own.file.id } })).status).toBe(201);
  });

  it("usages et fiche d'un fichier d'une autre commune : introuvables", async () => {
    const foreignFile = await strapi.db.query('plugin::upload.file').create({ data: { name: 'b2.png', hash: 'b2-secret', ext: '.png', mime: 'image/png', size: 1, url: '/uploads/b2.png', provider: 'local' } });
    const item = await strapi.documents('api::media-item.media-item').create({ data: { name: 'B2', file: foreignFile.id, site: siteB } as any });
    expect((await http.get(`/api/media-items/usage?file=${foreignFile.id}`).set(auth())).status).toBe(404);
    expect([403, 404]).toContain((await http.put(`/api/media-items/${item.documentId}`).set(auth()).send({ data: { alt_text: 'x' } })).status);
    expect([403, 404]).toContain((await http.delete(`/api/media-items/${item.documentId}`).set(auth())).status);
  });

  it('existant : un fichier hors médiathèque déjà lié au document reste accepté, pas un autre', async () => {
    const legacy = await strapi.db.query('plugin::upload.file').create({ data: { name: 'ancien.pdf', hash: 'ancien', ext: '.pdf', mime: 'application/pdf', size: 1, url: '/uploads/ancien.pdf', provider: 'local' } });
    const other = await strapi.db.query('plugin::upload.file').create({ data: { name: 'autre.pdf', hash: 'autre', ext: '.pdf', mime: 'application/pdf', size: 1, url: '/uploads/autre.pdf', provider: 'local' } });
    const doc = await strapi.documents('api::official-document.official-document').create({
      data: { title: 'Ancien arrêté', slug: 'ancien-arrete', document_type: 'arrete', document_date: '2020-01-01', year: 2020, site: siteA } as any,
    });
    // Lien posé avant la médiathèque (hors document service)
    const row = await strapi.db.query('api::official-document.official-document').findOne({ where: { documentId: doc.documentId } });
    await strapi.db.connection('files_related_mph').insert({ file_id: legacy.id, related_id: row.id, related_type: 'api::official-document.official-document', field: 'file', order: 1 });

    const keep = await http.put(`/api/official-documents/${doc.documentId}`).set(auth()).send({ data: { title: 'Ancien arrêté (modifié)', file: legacy.id } });
    expect(keep.status).toBe(200);
    const swap = await http.put(`/api/official-documents/${doc.documentId}`).set(auth()).send({ data: { file: other.id } });
    expect(swap.status).toBe(400);
  });
});
