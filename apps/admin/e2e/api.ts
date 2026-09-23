/**
 * API Strapi simulée pour les tests de l'admin : une commune, une session, l'état de mise en ligne.
 */
import type { Page } from '@playwright/test';

export const SITE = {
  documentId: 'site-saint-aubin',
  name: 'Saint-Aubin-sur-Loire',
  slug: 'saint-aubin-sur-loire',
  theme: 'institutionnel',
  live_url: 'https://saint-aubin-sur-loire.fr',
};

export const USERS = {
  admin: { id: 1, documentId: 'u-sophie', email: 'sophie.leroy@saint-aubin.fr', first_name: 'Sophie', last_name: 'Leroy', municipality_role: 'admin', site: SITE },
  editor: { id: 2, documentId: 'u-marc', email: 'marc@saint-aubin.fr', first_name: 'Marc', last_name: 'Dubois', municipality_role: 'editor', site: SITE },
  super_admin: { id: 3, documentId: 'u-equipe', email: 'equipe@communeo.fr', first_name: 'Léa', last_name: 'Communeo', municipality_role: 'super_admin', site: null },
};

export const SITES = [SITE, { documentId: 'site-bellefontaine', name: 'Bellefontaine', slug: 'bellefontaine', theme: 'moderne', live_url: null }];

/** Liens reçus par e-mail (GET /api/user-management/invitation?jeton=) */
export const LINKS: Record<string, object> = {
  'jeton-invitation': { status: 'valid', purpose: 'invitation', firstName: 'Anne', siteName: 'Saint-Aubin-sur-Loire', role: 'editor', email: 'anne@saint-aubin.fr' },
  'jeton-reinitialisation': { status: 'valid', purpose: 'reset', firstName: 'Sophie', siteName: 'Saint-Aubin-sur-Loire', role: 'admin', email: 'sophie.leroy@saint-aubin.fr' },
  'jeton-expire': { status: 'expired', purpose: 'invitation', firstName: 'Anne', siteName: 'Saint-Aubin-sur-Loire', role: 'editor' },
};

export const PASSWORD = 'bon-mot-de-passe';
export const INVALID_LOGIN = 'E-mail ou mot de passe incorrect. Vérifiez votre saisie ; après 5 essais, le compte est bloqué 15 minutes.';

export interface MockPage {
  documentId: string;
  title: string;
  slug: string;
  lead: string | null;
  meta_description: string | null;
  scheduled_at: string | null;
  publishedAt: string | null;
  updatedAt: string;
  blocks: unknown[];
}

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });

export const PAGES: Record<string, MockPage> = {
  'p-salle': {
    documentId: 'p-salle',
    title: 'Location de la salle des fêtes',
    slug: 'location-salle-des-fetes',
    lead: 'La salle accueille jusqu’à 180 personnes.',
    meta_description: null,
    scheduled_at: null,
    publishedAt: null,
    updatedAt: '2026-09-20T10:00:00.000Z',
    blocks: [
      { __component: 'blocks.text', id: 3, body: doc('Réservation en mairie.') },
      { __component: 'blocks.buttons', id: 4, buttons: [{ id: 9, label: 'Réserver', url: '/contact', style: 'primary' }] },
    ],
  },
};

const TITLES = [
  'La mairie et ses horaires', 'État civil : naissance, mariage, décès', "Carte nationale d'identité et passeport", 'Urbanisme : permis de construire',
  'Inscriptions scolaires 2026-2027', 'Cantine et accueil périscolaire', 'Médiathèque municipale', 'Conseil municipal : les élus', 'Budget de la commune',
  "Plan local d'urbanisme", 'Collecte des déchets', 'Déchetterie intercommunale', 'Associations sportives', 'Marché du samedi', 'Histoire et patrimoine',
  'Chemins de randonnée', 'Transport à la demande', 'Aide aux personnes âgées', 'Recensement citoyen', 'Jardins familiaux', 'Accueil des nouveaux habitants',
  'Salle omnisports', 'Bibliothèque de rue', 'Cimetière communal',
];

/** 25 pages : « Location de la salle des fêtes » et 24 autres, publiées sauf une sur quatre (brouillons), une programmée */
function manyPages(): Record<string, MockPage> {
  const pages: Record<string, MockPage> = { 'p-salle': structuredClone(PAGES['p-salle']!) };
  TITLES.forEach((title, index) => {
    const documentId = `p-${index + 1}`;
    pages[documentId] = {
      documentId,
      title,
      slug: title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      lead: null,
      meta_description: null,
      scheduled_at: title.startsWith('Inscriptions') ? '2026-11-03T07:00:00.000Z' : null,
      publishedAt: null,
      // Du plus récent (p-1) au plus ancien
      updatedAt: new Date(Date.UTC(2026, 8, 20, 12) - index * 3_600_000).toISOString(),
      blocks: [],
    };
  });
  return pages;
}

/** Actualités : une publiée, un brouillon, une programmée */
export const ARTICLES: Record<string, Record<string, unknown>> = {
  'a-dechetterie': {
    documentId: 'a-dechetterie', title: 'Nouveaux horaires de la déchetterie', slug: 'nouveaux-horaires-dechetterie', summary: 'Ouverture du mardi au samedi.', category: 'information', featured: false,
    publication_date: '2026-09-18T07:30:00.000Z', author: 'Sophie Leroy', meta_description: null, scheduled_at: null, publishedAt: null, updatedAt: '2026-09-18T07:30:00.000Z', blocks: [], image: null,
  },
  'a-conseil': {
    documentId: 'a-conseil', title: 'Compte rendu du conseil municipal', slug: 'compte-rendu-conseil', summary: null, category: 'news', featured: false,
    publication_date: null, author: 'Claire Martin', meta_description: null, scheduled_at: null, publishedAt: null, updatedAt: '2026-09-19T09:05:00.000Z', blocks: [], image: null,
  },
  'a-inscriptions': {
    documentId: 'a-inscriptions', title: 'Inscriptions scolaires 2026-2027', slug: 'inscriptions-scolaires', summary: null, category: 'news', featured: true,
    publication_date: null, author: 'Sophie Leroy', meta_description: null, scheduled_at: '2026-11-03T07:00:00.000Z', publishedAt: null, updatedAt: '2026-09-20T15:40:00.000Z', blocks: [], image: null,
  },
};

/** Événements : un à venir (publié), un passé (publié) */
export const EVENTS: Record<string, Record<string, unknown>> = {
  'e-fete': {
    documentId: 'e-fete', title: 'Fête de la musique', slug: 'fete-de-la-musique', category: 'celebration', featured: true, start_date: '2027-06-21T17:00:00.000Z', end_date: '2027-06-21T23:00:00.000Z',
    location: 'Place de la Mairie', address: null, price: 'Gratuit', registration_required: false, registration_deadline: null, max_participants: null, organizer: 'Comité des fêtes',
    external_link: null, contact_email: null, contact_phone: null, scheduled_at: null, publishedAt: null, updatedAt: '2026-09-15T10:00:00.000Z', blocks: [], image: null,
  },
  'e-forum': {
    documentId: 'e-forum', title: 'Forum des associations', slug: 'forum-des-associations', category: 'meeting', featured: false, start_date: '2025-09-06T08:00:00.000Z', end_date: null,
    location: 'Salle omnisports', address: null, price: 'Free', registration_required: false, registration_deadline: null, max_participants: null, organizer: null,
    external_link: null, contact_email: null, contact_phone: null, scheduled_at: null, publishedAt: null, updatedAt: '2025-09-01T10:00:00.000Z', blocks: [], image: null,
  },
};

const PDF = { id: 900, name: 'deliberation.pdf', ext: '.pdf', mime: 'application/pdf', size: 310, url: '/uploads/deliberation.pdf' };
const DOCUMENT_TYPES = ['deliberation', 'deliberation', 'deliberation', 'arrete', 'pv-conseil-municipal'];

/** Documents officiels : trois, ou 300 répartis de 2019 à 2026 (critère « plusieurs centaines ») */
function officialDocuments(many: boolean): Record<string, Record<string, unknown>> {
  const years = many ? [[2026, 38], [2025, 61], [2024, 57], [2023, 44], [2022, 40], [2021, 30], [2020, 20], [2019, 10]] : [[2026, 2], [2025, 1]];
  const docs: Record<string, Record<string, unknown>> = {};
  for (const [year, count] of years as Array<[number, number]>) {
    for (let index = 1; index <= count; index += 1) {
      const documentId = `d-${year}-${index}`;
      const type = DOCUMENT_TYPES[index % DOCUMENT_TYPES.length]!;
      const month = String(((index * 7) % 12) + 1).padStart(2, '0');
      docs[documentId] = {
        documentId, title: `${type === 'arrete' ? 'Arrêté' : type === 'deliberation' ? 'Délibération' : 'Procès-verbal'} ${year}-${String(index).padStart(3, '0')}${index === 3 ? ' — Convention avec le SDIS' : ''}`,
        slug: `${type}-${year}-${index}`, document_type: type, reference_number: `DEL-${year}-${String(index).padStart(3, '0')}`, document_date: `${year}-${month}-15`, session_date: null, year,
        description: null, file: PDF, additional_files: [], scheduled_at: null, publishedAt: null, updatedAt: `${year}-${month}-16T10:00:00.000Z`,
      };
    }
  }
  return docs;
}

/** Équipe : la maire et deux adjoints */
export const TEAM = [
  { documentId: 't-martin', first_name: 'Claire', last_name: 'Martin', role: 'maire', title: null, delegation: null, bio: null, email: null, office_hours: null, display_order: 10, photo: null },
  { documentId: 't-morel', first_name: 'Julien', last_name: 'Morel', role: 'adjoint', title: '1er adjoint', delegation: 'Vie associative, sports', bio: null, email: null, office_hours: null, display_order: 10, photo: null },
  { documentId: 't-rousseau', first_name: 'Anne', last_name: 'Rousseau', role: 'adjoint', title: '2e adjointe', delegation: 'Affaires scolaires', bio: null, email: null, office_hours: null, display_order: 20, photo: null },
];

const isDraftOnly = (documentId: string) => /^p-(\d+)$/.test(documentId) && Number(documentId.slice(2)) % 4 === 0;

export interface MockOptions {
  user?: keyof typeof USERS;
  publication?: 'pending' | 'ok' | 'running' | 'failed';
  unread?: number;
  loggedIn?: boolean;
  /** Réponse d'erreur à l'enregistrement des pages */
  failPageSaves?: boolean;
  /** Serveur de preview non configuré (503 sur le jeton) */
  previewUnavailable?: boolean;
  /** Pages de la commune : une (défaut), 25, ou aucune */
  pageSet?: 'one' | 'many' | 'none';
  /** Pages dont la publication échoue (champs incomplets) */
  failPublishFor?: string[];
  /** Menu du site (Site.navigation_config) ; par défaut deux rubriques et un groupe */
  navigation?: unknown;
  /** Thème de la commune */
  theme?: string;
  /** Documents officiels : 3 (défaut) ou 300 */
  documentSet?: 'few' | 'many';
  /** Équipe vide */
  emptyTeam?: boolean;
}

export const NAVIGATION = {
  main: [
    { type: 'section', section: 'actualites', label: null },
    { type: 'group', label: 'Vie pratique', children: [{ type: 'page', pageDocumentId: 'p-salle', label: null }, { type: 'section', section: 'dechets', label: null }] },
    { type: 'section', section: 'agenda', label: null },
  ],
  footer: [{ type: 'external', url: 'https://www.service-public.fr', label: 'Service-Public' }],
};

export async function mockApi(page: Page, options: MockOptions = {}) {
  const { user = 'admin', publication = 'pending', unread = 3, loggedIn = true, failPageSaves = false, previewUnavailable = false, pageSet = 'one', failPublishFor = [], navigation = NAVIGATION, theme = 'institutionnel', documentSet = 'few', emptyTeam = false } = options;
  const calls: string[] = [];
  const bodies: Array<{ call: string; type?: ContentType; body: { data: Record<string, unknown> } }> = [];
  const posts: Record<string, unknown[]> = {};
  let state = publication;
  const pages: Record<string, MockPage> = pageSet === 'many' ? manyPages() : pageSet === 'none' ? {} : structuredClone(PAGES);
  // Contenus par type (API Strapi), version en ligne et modifications depuis
  const stores: Record<ContentType, Record<string, Record<string, unknown>>> = {
    pages: pages as unknown as Record<string, Record<string, unknown>>,
    articles: structuredClone(ARTICLES),
    evenements: structuredClone(EVENTS),
    'official-documents': officialDocuments(documentSet === 'many'),
  };
  const team = emptyTeam ? [] : structuredClone(TEAM) as Array<Record<string, unknown>>;
  let uploads = 0;
  const published = new Set<string>(Object.keys(pages).filter((id) => !isDraftOnly(id) && !pages[id]!.scheduled_at));
  const publishedByType: Record<ContentType, Set<string>> = {
    pages: published,
    articles: new Set(['a-dechetterie']),
    evenements: new Set(['e-fete', 'e-forum']),
    'official-documents': new Set(Object.keys(stores['official-documents']).filter((id) => !id.endsWith('-2'))),
  };
  const modifiedByType: Record<ContentType, Set<string>> = { pages: new Set(), articles: new Set(), evenements: new Set(), 'official-documents': new Set() };

  // Session côté « serveur » (cookie HttpOnly en vrai) : l'admin ne voit jamais de jeton
  let session = loggedIn;
  const site = { documentId: SITE.documentId, updatedAt: '2026-09-22T14:30:00.000Z', theme, comarquage_enabled: true, open_data_enabled: false, navigation_config: structuredClone(navigation) as unknown };
  // Réglages reçus par le serveur de preview (POST de l'admin)
  const previewPosts: Array<Record<string, unknown>> = [];
  // Mots de passe acceptés : celui des comptes de test, et ceux choisis par invitation
  const passwords = new Set([PASSWORD]);

  // Serveur de preview simulé : la page demandée, avec le numéro de version reçu
  await page.route('http://preview.test/**', (route) => {
    const url = new URL(route.request().url());
    // Réglages non enregistrés : le menu reçu est affiché (libellés des entrées)
    let menu = '';
    if (route.request().method() === 'POST') {
      const form = new URLSearchParams(route.request().postData() ?? '');
      const settings = JSON.parse(form.get('settings') ?? '{}') as { navigation_config?: { main: Array<{ label?: string | null; section?: string }> } };
      previewPosts.push({ token: form.get('token'), ...settings });
      menu = `<nav aria-label="Menu principal"><ul>${(settings.navigation_config?.main ?? []).map((item) => `<li>${item.label ?? item.section ?? 'page'}</li>`).join('')}</ul></nav>`;
    }
    const html = `<!doctype html><html lang="fr"><head><title>Aperçu</title></head><body>${menu}<main><h1>Aperçu de ${url.pathname}</h1><p id="version">version ${url.searchParams.get('v')}</p></main></body></html>`;
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: html });
  });

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    const status = url.searchParams.get('status');
    calls.push(`${method} ${url.pathname}${method !== 'GET' && status ? `?status=${status}` : ''}`);
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    // Comme Strapi : toute écriture de l'admin porte l'en-tête de sécurité
    if (method !== 'GET' && route.request().headers()['x-communeo-csrf'] !== '1') {
      return json({ error: { status: 403, message: 'Requête refusée : en-tête de sécurité manquant' } }, 403);
    }
    if (method === 'POST' && !url.pathname.endsWith('/upload')) (posts[url.pathname] ??= []).push(route.request().postDataJSON());
    if (url.pathname === '/api/session/login') {
      const body = route.request().postDataJSON() as { identifier: string; password: string; remember?: boolean };
      if (!passwords.has(body.password)) return json({ error: { status: 400, message: INVALID_LOGIN } }, 400);
      session = true;
      return json({ ok: true, expiresIn: body.remember ? 2_592_000 : 43200 });
    }
    if (url.pathname === '/api/session/logout') {
      session = false;
      return route.fulfill({ status: 204 });
    }
    // Écrans d'accès, sans session
    if (url.pathname === '/api/user-management/invitation') return json(LINKS[url.searchParams.get('jeton') ?? ''] ?? { status: 'invalid' });
    if (url.pathname === '/api/user-management/accept-invitation') {
      const body = route.request().postDataJSON() as { password: string };
      if (body.password.length < 10) return json({ error: { status: 400, message: 'Le mot de passe doit contenir au moins 10 caractères' } }, 400);
      passwords.add(body.password);
      return json({ ok: true });
    }
    if (url.pathname === '/api/user-management/request-invitation' || url.pathname === '/api/user-management/forgot-password') return json({ ok: true });

    if (!session) return json({ error: { status: 403, message: 'Forbidden' } }, 403);
    if (url.pathname === '/api/users/me') return json(USERS[user]);
    if (url.pathname === `/api/sites/${SITE.documentId}`) {
      if (method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: 'PUT site', body });
        Object.assign(site, body.data, { updatedAt: new Date().toISOString() });
      }
      return json({ data: site });
    }
    if (url.pathname === '/api/user-management/admins') return json({ data: [{ name: 'Sophie Leroy' }, { name: 'Claire Martin' }] });
    if (url.pathname === '/api/site-management' && USERS[user].municipality_role === 'super_admin') return json({ data: SITES });
    const siteMatch = /^\/api\/site-management\/([^/]+)$/.exec(url.pathname);
    if (siteMatch && USERS[user].municipality_role === 'super_admin') {
      const site = SITES.find((candidate) => candidate.documentId === siteMatch[1]);
      return site ? json({ data: site }) : json({ error: { status: 404, message: 'Site not found' } }, 404);
    }
    if (url.pathname === '/api/deployment/state') {
      return json({ state, pendingCount: state === 'pending' ? 3 : 0, step: state === 'running' ? 'rendering' : null, reference: null });
    }
    if (url.pathname === '/api/deployment/trigger' && method === 'POST') {
      state = 'running';
      return json({ status: 'queued', queued: true }, 202);
    }
    if (url.pathname === '/api/publication/official-documents/years') {
      const counts = new Map<number, number>();
      for (const doc of Object.values(stores['official-documents'])) if (doc.year) counts.set(doc.year as number, (counts.get(doc.year as number) ?? 0) + 1);
      return json({ data: [...counts].sort(([a], [b]) => b - a).map(([year, count]) => ({ year, count })) });
    }
    if (url.pathname === '/api/media-items/upload' && method === 'POST') {
      const body = route.request().postDataBuffer()?.toString('latin1') ?? '';
      const name = /filename="([^"]+)"/.exec(body)?.[1] ?? 'fichier';
      const mime = /Content-Type: ([^\r\n]+)/.exec(body)?.[1] ?? 'application/octet-stream';
      uploads += 1;
      const file = { id: 1000 + uploads, name, ext: name.slice(name.lastIndexOf('.')), mime, size: 42, url: `/uploads/${name}` };
      posts['upload'] = [...(posts['upload'] ?? []), file];
      return json({ data: { documentId: `m-${uploads}`, name, file } }, 201);
    }
    const teamMatch = /^\/api\/team-members(?:\/([^/]+))?$/.exec(url.pathname);
    if (teamMatch) {
      const id = teamMatch[1];
      if (method === 'GET') return json({ data: [...team].sort((a, b) => ((a.display_order as number) ?? 999) - ((b.display_order as number) ?? 999)), meta: { pagination: { page: 1, pageCount: 1, total: team.length } } });
      if (method === 'DELETE' && id) {
        team.splice(team.findIndex((member) => member.documentId === id), 1);
        return route.fulfill({ status: 204 });
      }
      const body = route.request().postDataJSON() as { data: Record<string, unknown> };
      bodies.push({ call: `${method} team`, body });
      const photoId = body.data.photo;
      const data = { ...body.data, ...(photoId !== undefined ? { photo: photoId ? { id: photoId, name: 'photo.png', ext: '.png', size: 42, url: '/uploads/photo.png' } : null } : {}) };
      if (method === 'POST') {
        const member = { documentId: `t-${team.length + 1}`, photo: null, ...data };
        team.push(member);
        return json({ data: member }, 201);
      }
      const member = team.find((item) => item.documentId === id);
      if (!member) return json({ error: { status: 404, message: 'Not Found' } }, 404);
      Object.assign(member, data);
      return json({ data: member });
    }
    const contentMatch = /^\/api\/(pages|articles|evenements|official-documents)(?:\/([^/]+))?$/.exec(url.pathname);
    if (contentMatch) {
      const type = contentMatch[1] as ContentType;
      const id = contentMatch[2];
      const store = stores[type];
      const online = publishedByType[type];
      if (method === 'GET' && !id) return json(listDocuments(store, url.searchParams));
      if (method === 'GET' && id) {
        const doc = store[id];
        if (!doc || (status === 'published' && !online.has(id))) return json({ data: null, error: { status: 404, message: 'Not Found' } }, 404);
        return json({ data: status === 'published' ? { ...doc, publishedAt: '2026-09-21T08:00:00.000Z' } : doc });
      }
      if (method === 'POST' || method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: `${method} ${status ?? 'draft'}`, type, body });
        if (failPageSaves) return json({ error: { status: 500, message: 'Erreur du serveur' } }, 500);
        if (status === 'published' && id && failPublishFor.includes(id)) return json({ error: { status: 400, message: 'Le bloc 1 (Texte) est vide.' } }, 400);
        const documentId = id ?? `${type.charAt(0)}-nouvelle`;
        const slug = (body.data.slug as string) || String(body.data.title ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const base = store[documentId] ?? (type === 'pages' ? PAGES['p-salle']! : {});
        const doc = { ...base, ...body.data, documentId, slug, updatedAt: new Date().toISOString() } as Record<string, unknown>;
        // Comme le backend : une actualité reçoit sa date à la première publication
        if (type === 'articles' && status === 'published' && !doc.publication_date) doc.publication_date = new Date().toISOString();
        store[documentId] = doc;
        if (status === 'published') {
          online.add(documentId);
          modifiedByType[type].delete(documentId);
        } else if (online.has(documentId)) modifiedByType[type].add(documentId);
        return json({ data: doc }, method === 'POST' ? 201 : 200);
      }
      if (method === 'DELETE' && id) {
        delete store[id];
        online.delete(id);
        return route.fulfill({ status: 204 });
      }
    }
    const statesMatch = /^\/api\/publication\/(pages|articles|evenements|official-documents)$/.exec(url.pathname);
    if (statesMatch) {
      const type = statesMatch[1] as ContentType;
      return json({
        data: Object.fromEntries(
          Object.values(stores[type]).map((doc) => {
            const documentId = doc.documentId as string;
            const state = publishedByType[type].has(documentId) ? (modifiedByType[type].has(documentId) ? 'modified' : 'published') : 'draft';
            return [documentId, { state, scheduledAt: doc.scheduled_at ?? null }];
          }),
        ),
      });
    }
    const unpublish = /^\/api\/publication\/(pages|articles|evenements|official-documents)\/([^/]+)\/unpublish$/.exec(url.pathname);
    if (unpublish && method === 'POST') {
      const type = unpublish[1] as ContentType;
      publishedByType[type].delete(unpublish[2]!);
      modifiedByType[type].delete(unpublish[2]!);
      return json({ data: { documentId: unpublish[2], state: 'draft' } });
    }
    if (url.pathname === '/api/preview/token' && method === 'POST') {
      if (previewUnavailable) return json({ error: { status: 503, message: "Preview indisponible : PREVIEW_SECRET n'est pas défini" } }, 503);
      const body = route.request().postDataJSON() as { type?: string; documentId?: string };
      const type: ContentType = body.type === 'article' ? 'articles' : body.type === 'evenement' ? 'evenements' : 'pages';
      const prefix = type === 'articles' ? 'actualites/' : type === 'evenements' ? 'agenda/' : '';
      const slug = (body.documentId && (stores[type][body.documentId]?.slug as string | undefined)) ?? '';
      return json({ url: `http://preview.test/${slug ? prefix : ''}${slug}?token=jeton-signe`, expiresAt: new Date(Date.now() + 1_800_000).toISOString() });
    }
    if (url.pathname === '/api/contact-submissions') {
      return json({ data: [], meta: { pagination: { total: unread, page: 1, pageSize: 1, pageCount: unread } } });
    }
    return json({ error: { status: 404, message: 'Not Found' } }, 404);
  });

  return {
    site,
    team,
    stores,
    publishedByType,
    previewPosts,
    published,
    calls,
    bodies,
    pages,
    /** Corps des POST reçus, par route */
    posts,
    /** La session expire côté serveur (le cookie n'est plus valable) */
    expireSession: () => {
      session = false;
    },
  };
}

export type ContentType = 'pages' | 'articles' | 'evenements' | 'official-documents';

/** Liste façon Strapi : recherche, statut par identifiants, catégorie, période, tri, pagination */
function listDocuments(store: Record<string, Record<string, unknown>>, params: URLSearchParams) {
  const all = (prefix: string) => [...params.entries()].filter(([key]) => key.startsWith(prefix)).map(([, value]) => value);
  const q = params.get('filters[title][$containsi]')?.toLowerCase();
  const inIds = all('filters[documentId][$in]');
  const notIn = all('filters[documentId][$notIn]');
  const category = params.get('filters[category][$eq]');
  const documentType = params.get('filters[document_type][$eq]');
  const year = params.get('filters[year][$eq]');
  const yearBefore = params.get('filters[year][$lt]');
  const upcoming = params.get('filters[$or][0][end_date][$gte]');
  const past = params.get('filters[$or][0][end_date][$lt]');
  const lastDay = (doc: Record<string, unknown>) => String(doc.end_date ?? doc.start_date ?? '');
  let rows = Object.values(store).filter((doc) => {
    if (q && !String(doc.title).toLowerCase().includes(q)) return false;
    if (params.has('filters[documentId][$in][0]') && !inIds.includes(doc.documentId as string)) return false;
    if (notIn.includes(doc.documentId as string)) return false;
    if (params.has('filters[scheduled_at][$notNull]') && !doc.scheduled_at) return false;
    if (params.has('filters[scheduled_at][$null]') && doc.scheduled_at) return false;
    if (category && doc.category !== category) return false;
    if (documentType && doc.document_type !== documentType) return false;
    if (year && String(doc.year) !== year) return false;
    if (yearBefore && Number(doc.year) >= Number(yearBefore)) return false;
    if (upcoming && lastDay(doc) < upcoming) return false;
    if (past && lastDay(doc) >= past) return false;
    return true;
  });
  const [field, order] = (params.get('sort[0]') ?? 'updatedAt:desc').split(':') as [string, string];
  rows = rows.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''), 'fr') * (order === 'desc' ? -1 : 1));
  const page = Number(params.get('pagination[page]') ?? 1);
  const pageSize = Number(params.get('pagination[pageSize]') ?? 25);
  const data = rows.slice((page - 1) * pageSize, page * pageSize).map(({ blocks: _blocks, ...row }) => ({ featured_image: null, image: null, ...row }));
  return { data, meta: { pagination: { page, pageSize, total: rows.length, pageCount: Math.ceil(rows.length / pageSize) } } };
}
