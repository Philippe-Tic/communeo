/**
 * Chargement d'une commune par le renderer : le loader Strapi de @communeo/core, avec le token de build
 * en lecture seule, contre une vraie instance Strapi. Vérifie les requêtes (populate, filtres), les droits
 * du token et la séparation publié / brouillon.
 */
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/strapi';
import { createContentSource, createStrapiLoader, type ContentSource } from '@communeo/core';
import { BUILD_TOKEN_PERMISSIONS } from '../src/bootstrap/build-token';
import { setupStrapi, teardownStrapi } from './strapi';

let strapi: Core.Strapi;
let apiUrl: string;
let token: string;
let siteId: string;
let source: ContentSource;

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

beforeAll(async () => {
  strapi = await setupStrapi();
  // Déjà à l'écoute sur 127.0.0.1 (tests/strapi.ts)
  apiUrl = `http://127.0.0.1:${(strapi.server.httpServer.address() as AddressInfo).port}`;

  const created = await strapi.service('admin::api-token').create({
    name: 'Build Token (tests)',
    type: 'custom',
    lifespan: null,
    permissions: BUILD_TOKEN_PERMISSIONS,
  });
  token = created.accessKey;

  const site = await strapi.documents('api::site.site').findFirst({ filters: { slug: 'test-site' } });
  siteId = site!.documentId;
  await strapi.documents('api::site.site').update({
    documentId: siteId,
    data: {
      contact_phone: '02 41 00 00 00',
      infos_pratiques: {
        population: 3240,
        opening_hours: {
          days: { monday: [{ open: '09:00', close: '12:00' }], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
          closures: [],
        },
      },
      homepage: { hero: { enabled: true, title: 'Bienvenue' }, featured_news: { enabled: true, count: 3 } },
      navigation_config: { main: [{ type: 'section', section: 'actualites' }], footer: [] },
    } as any,
  });

  await strapi.documents('api::article.article').create({
    status: 'published',
    data: { title: 'Réouverture de la médiathèque', slug: 'reouverture', site: siteId, blocks: [{ __component: 'blocks.text', body: doc(p('Bonne nouvelle')) }] } as any,
  });
  await strapi.documents('api::article.article').create({ data: { title: 'Brouillon secret', slug: 'brouillon', site: siteId } as any });

  const other = await strapi.documents('api::site.site').create({ data: { name: 'Commune voisine', slug: 'voisine', contact_mail: 'v@example.test' } as any });
  await strapi.documents('api::article.article').create({ status: 'published', data: { title: 'Article de la voisine', slug: 'voisine', site: other.documentId } as any });
  await strapi.documents('api::contact-submission.contact-submission').create({
    data: { first_name: 'A', last_name: 'B', email: 'a@example.test', subject: 's', message: 'donnée personnelle', category: 'general', status: 'received', site: siteId } as any,
  });

  source = createContentSource(createStrapiLoader({ apiUrl, token, siteDocumentId: siteId }), { siteUrl: 'https://test.example', mediaUrl: apiUrl });
});

afterAll(async () => {
  await teardownStrapi();
});

describe('loader Strapi du renderer', () => {
  it('charge le site avec ses réglages', async () => {
    const site = await source.site();
    expect(site.name).toBe('Test Site');
    expect(site.contact.phone?.href).toBe('tel:+33241000000');
    expect(site.contact.hoursSummary).toEqual([{ days: 'Lun', hours: '9h–12h' }]);
    expect(site.population).toBe(3240);
  });

  it("ne charge que les contenus publiés de la commune (pas les brouillons, pas la voisine)", async () => {
    const titles = (await source.articles()).map((article) => article.title);
    expect(titles).toContain('Réouverture de la médiathèque');
    expect(titles).not.toContain('Brouillon secret');
    expect(titles).not.toContain('Article de la voisine');
  });

  it('peuple les blocs', async () => {
    const article = (await source.articles()).find((a) => a.title.startsWith('Réouverture'));
    expect(article?.blocks[0]).toMatchObject({ type: 'text' });
  });

  it("construit l'accueil et les menus", async () => {
    const [home, nav, pages] = await Promise.all([source.home(), source.navigation(), source.pages()]);
    expect(home.hero?.title).toBe('Bienvenue');
    expect(home.featuredNews?.map((a) => a.title)).toEqual(['Réouverture de la médiathèque']);
    expect(nav.main[0]).toMatchObject({ label: 'Actualités', href: '/actualites' });
    expect(pages.map((page) => page.href)).toContain('/page-de-test');
  });

  it('la preview voit les brouillons', async () => {
    const preview = createContentSource(createStrapiLoader({ apiUrl, token, siteDocumentId: siteId, status: 'draft' }), {
      siteUrl: 'https://test.example',
      mediaUrl: apiUrl,
    });
    expect((await preview.articles()).map((a) => a.title)).toContain('Brouillon secret');
  });

  it("le token de build n'a pas accès aux données personnelles ni à l'écriture", async () => {
    const headers = { Authorization: `Bearer ${token}` };
    expect((await fetch(`${apiUrl}/api/contact-submissions`, { headers })).status).toBe(403);
    expect((await fetch(`${apiUrl}/api/newsletter-subscribers`, { headers })).status).toBe(403);
    const write = await fetch(`${apiUrl}/api/articles`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { title: 'Intrus' } }),
    });
    expect(write.status).toBe(403);
  });
});
