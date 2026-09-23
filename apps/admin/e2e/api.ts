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
  admin: {
    id: 1,
    documentId: 'u-sophie',
    email: 'sophie.leroy@saint-aubin.fr',
    first_name: 'Sophie',
    last_name: 'Leroy',
    municipality_role: 'admin',
    site: SITE,
  },
  editor: {
    id: 2,
    documentId: 'u-marc',
    email: 'marc@saint-aubin.fr',
    first_name: 'Marc',
    last_name: 'Dubois',
    municipality_role: 'editor',
    site: SITE,
  },
  super_admin: {
    id: 3,
    documentId: 'u-equipe',
    email: 'equipe@communeo.fr',
    first_name: 'Léa',
    last_name: 'Communeo',
    municipality_role: 'super_admin',
    site: null,
  },
};

export const SITES = [
  SITE,
  { documentId: 'site-bellefontaine', name: 'Bellefontaine', slug: 'bellefontaine', theme: 'moderne', live_url: null },
];

/** Liens reçus par e-mail (GET /api/user-management/invitation?jeton=) */
export const LINKS: Record<string, object> = {
  'jeton-invitation': {
    status: 'valid',
    purpose: 'invitation',
    firstName: 'Anne',
    siteName: 'Saint-Aubin-sur-Loire',
    role: 'editor',
    email: 'anne@saint-aubin.fr',
  },
  'jeton-reinitialisation': {
    status: 'valid',
    purpose: 'reset',
    firstName: 'Sophie',
    siteName: 'Saint-Aubin-sur-Loire',
    role: 'admin',
    email: 'sophie.leroy@saint-aubin.fr',
  },
  'jeton-expire': {
    status: 'expired',
    purpose: 'invitation',
    firstName: 'Anne',
    siteName: 'Saint-Aubin-sur-Loire',
    role: 'editor',
  },
};

export const PASSWORD = 'bon-mot-de-passe';
export const INVALID_LOGIN =
  'E-mail ou mot de passe incorrect. Vérifiez votre saisie ; après 5 essais, le compte est bloqué 15 minutes.';

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
      {
        __component: 'blocks.buttons',
        id: 4,
        buttons: [{ id: 9, label: 'Réserver', url: '/contact', style: 'primary' }],
      },
    ],
  },
};

const TITLES = [
  'La mairie et ses horaires',
  'État civil : naissance, mariage, décès',
  "Carte nationale d'identité et passeport",
  'Urbanisme : permis de construire',
  'Inscriptions scolaires 2026-2027',
  'Cantine et accueil périscolaire',
  'Médiathèque municipale',
  'Conseil municipal : les élus',
  'Budget de la commune',
  "Plan local d'urbanisme",
  'Collecte des déchets',
  'Déchetterie intercommunale',
  'Associations sportives',
  'Marché du samedi',
  'Histoire et patrimoine',
  'Chemins de randonnée',
  'Transport à la demande',
  'Aide aux personnes âgées',
  'Recensement citoyen',
  'Jardins familiaux',
  'Accueil des nouveaux habitants',
  'Salle omnisports',
  'Bibliothèque de rue',
  'Cimetière communal',
];

/** 25 pages : « Location de la salle des fêtes » et 24 autres, publiées sauf une sur quatre (brouillons), une programmée */
function manyPages(): Record<string, MockPage> {
  const pages: Record<string, MockPage> = { 'p-salle': structuredClone(PAGES['p-salle']!) };
  TITLES.forEach((title, index) => {
    const documentId = `p-${index + 1}`;
    pages[documentId] = {
      documentId,
      title,
      slug: title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
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
    documentId: 'a-dechetterie',
    title: 'Nouveaux horaires de la déchetterie',
    slug: 'nouveaux-horaires-dechetterie',
    summary: 'Ouverture du mardi au samedi.',
    category: 'information',
    featured: false,
    publication_date: '2026-09-18T07:30:00.000Z',
    author: 'Sophie Leroy',
    meta_description: null,
    scheduled_at: null,
    publishedAt: null,
    updatedAt: '2026-09-18T07:30:00.000Z',
    blocks: [],
    image: null,
  },
  'a-conseil': {
    documentId: 'a-conseil',
    title: 'Compte rendu du conseil municipal',
    slug: 'compte-rendu-conseil',
    summary: null,
    category: 'news',
    featured: false,
    publication_date: null,
    author: 'Claire Martin',
    meta_description: null,
    scheduled_at: null,
    publishedAt: null,
    updatedAt: '2026-09-19T09:05:00.000Z',
    blocks: [],
    image: null,
  },
  'a-inscriptions': {
    documentId: 'a-inscriptions',
    title: 'Inscriptions scolaires 2026-2027',
    slug: 'inscriptions-scolaires',
    summary: null,
    category: 'news',
    featured: true,
    publication_date: null,
    author: 'Sophie Leroy',
    meta_description: null,
    scheduled_at: '2026-11-03T07:00:00.000Z',
    publishedAt: null,
    updatedAt: '2026-09-20T15:40:00.000Z',
    blocks: [],
    image: null,
  },
};

/** Événements : un à venir (publié), un passé (publié) */
export const EVENTS: Record<string, Record<string, unknown>> = {
  'e-fete': {
    documentId: 'e-fete',
    title: 'Fête de la musique',
    slug: 'fete-de-la-musique',
    category: 'celebration',
    featured: true,
    start_date: '2027-06-21T17:00:00.000Z',
    end_date: '2027-06-21T23:00:00.000Z',
    location: 'Place de la Mairie',
    address: null,
    price: 'Gratuit',
    registration_required: false,
    registration_deadline: null,
    max_participants: null,
    organizer: 'Comité des fêtes',
    external_link: null,
    contact_email: null,
    contact_phone: null,
    scheduled_at: null,
    publishedAt: null,
    updatedAt: '2026-09-15T10:00:00.000Z',
    blocks: [],
    image: null,
  },
  'e-forum': {
    documentId: 'e-forum',
    title: 'Forum des associations',
    slug: 'forum-des-associations',
    category: 'meeting',
    featured: false,
    start_date: '2025-09-06T08:00:00.000Z',
    end_date: null,
    location: 'Salle omnisports',
    address: null,
    price: 'Free',
    registration_required: false,
    registration_deadline: null,
    max_participants: null,
    organizer: null,
    external_link: null,
    contact_email: null,
    contact_phone: null,
    scheduled_at: null,
    publishedAt: null,
    updatedAt: '2025-09-01T10:00:00.000Z',
    blocks: [],
    image: null,
  },
};

const PDF = {
  id: 900,
  name: 'deliberation.pdf',
  ext: '.pdf',
  mime: 'application/pdf',
  size: 310,
  url: '/uploads/deliberation.pdf',
};
const DOCUMENT_TYPES = ['deliberation', 'deliberation', 'deliberation', 'arrete', 'pv-conseil-municipal'];

/** Documents officiels : trois, ou 300 répartis de 2019 à 2026 (critère « plusieurs centaines ») */
function officialDocuments(many: boolean): Record<string, Record<string, unknown>> {
  const years = many
    ? [
        [2026, 38],
        [2025, 61],
        [2024, 57],
        [2023, 44],
        [2022, 40],
        [2021, 30],
        [2020, 20],
        [2019, 10],
      ]
    : [
        [2026, 2],
        [2025, 1],
      ];
  const docs: Record<string, Record<string, unknown>> = {};
  for (const [year, count] of years as Array<[number, number]>) {
    for (let index = 1; index <= count; index += 1) {
      const documentId = `d-${year}-${index}`;
      const type = DOCUMENT_TYPES[index % DOCUMENT_TYPES.length]!;
      const month = String(((index * 7) % 12) + 1).padStart(2, '0');
      docs[documentId] = {
        documentId,
        title: `${type === 'arrete' ? 'Arrêté' : type === 'deliberation' ? 'Délibération' : 'Procès-verbal'} ${year}-${String(index).padStart(3, '0')}${index === 3 ? ' — Convention avec le SDIS' : ''}`,
        slug: `${type}-${year}-${index}`,
        document_type: type,
        reference_number: `DEL-${year}-${String(index).padStart(3, '0')}`,
        document_date: `${year}-${month}-15`,
        session_date: null,
        year,
        description: null,
        file: PDF,
        additional_files: [],
        scheduled_at: null,
        publishedAt: null,
        updatedAt: `${year}-${month}-16T10:00:00.000Z`,
      };
    }
  }
  return docs;
}

/** Équipe : la maire et deux adjoints */
export const TEAM = [
  {
    documentId: 't-martin',
    first_name: 'Claire',
    last_name: 'Martin',
    role: 'maire',
    title: null,
    delegation: null,
    bio: null,
    email: null,
    office_hours: null,
    display_order: 10,
    photo: null,
  },
  {
    documentId: 't-morel',
    first_name: 'Julien',
    last_name: 'Morel',
    role: 'adjoint',
    title: '1er adjoint',
    delegation: 'Vie associative, sports',
    bio: null,
    email: null,
    office_hours: null,
    display_order: 10,
    photo: null,
  },
  {
    documentId: 't-rousseau',
    first_name: 'Anne',
    last_name: 'Rousseau',
    role: 'adjoint',
    title: '2e adjointe',
    delegation: 'Affaires scolaires',
    bio: null,
    email: null,
    office_hours: null,
    display_order: 20,
    photo: null,
  },
];

const isDraftOnly = (documentId: string) => /^p-(\d+)$/.test(documentId) && Number(documentId.slice(2)) % 4 === 0;

export interface MockOptions {
  user?: keyof typeof USERS;
  publication?: 'pending' | 'ok' | 'running' | 'failed';
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
  /** Abonnés à la newsletter : 45 (défaut) ou aucun */
  subscriberSet?: 'some' | 'none';
  /** Export CSV en échec (500) */
  failExport?: boolean;
  /** Messages des habitants : 6 dont 3 non lus (défaut) ou aucun */
  messageSet?: 'some' | 'none';
  /** L'e-mail de réponse ne part pas (502) */
  failReply?: boolean;
  /** Associations : 3 publiées, 2 propositions (défaut) ou aucune */
  associationSet?: 'some' | 'none';
  /** L'e-mail de refus ne part pas (`emailed: false`) */
  failRejectEmail?: boolean;
  /** Alertes : une active, une programmée, deux passées (défaut) ou aucune */
  alertSet?: 'some' | 'none';
  /** Collectes : 5 (défaut) ou aucune */
  wasteSet?: 'some' | 'none';
  /** Médiathèque : 5 fichiers (défaut) ou aucun */
  mediaSet?: 'some' | 'none';
  /** L'envoi d'un fichier échoue (réponse 400 de Strapi) */
  failUploadFor?: string;
  /** La page « Location de la salle des fêtes » contient une image sans texte alternatif */
  pageImageWithoutAlt?: boolean;
}

export type MockMedia = {
  documentId: string;
  name: string;
  folder: string | null;
  uploaded_by_name: string | null;
  createdAt: string;
  file: Record<string, unknown> & { id: number; mime: string; alternativeText: string | null };
};

function mediaItems(): MockMedia[] {
  const item = (
    id: number,
    name: string,
    mime: string,
    folder: string | null,
    fields: Record<string, unknown> = {},
  ): MockMedia => ({
    documentId: `mi-${id}`,
    name,
    folder,
    uploaded_by_name: 'Sophie Leroy',
    createdAt: new Date(Date.UTC(2026, 8, 20 - id)).toISOString(),
    file: {
      id: 500 + id,
      name,
      ext: name.slice(name.lastIndexOf('.')),
      mime,
      size: 1200,
      url: `/uploads/${name}`,
      width: mime.startsWith('image/') ? 1600 : null,
      height: mime.startsWith('image/') ? 1067 : null,
      alternativeText: null,
      caption: null,
      credit: null,
      formats: null,
      ...fields,
    },
  });
  return [
    item(1, 'salle-des-fetes-exterieur.jpg', 'image/jpeg', 'Bâtiments', {
      alternativeText: 'Façade de la salle des fêtes Jean-Moulin',
    }),
    item(2, 'forum-associations.jpg', 'image/jpeg', 'Événements'),
    item(3, 'reglement-salle.pdf', 'application/pdf', 'Documents officiels'),
    item(4, 'blason.svg', 'image/svg+xml', 'Logos et blasons', { alternativeText: 'Blason de la commune' }),
    item(5, 'conseil-municipal.jpg', 'image/jpeg', null),
  ];
}

export type MockMenu = Record<string, unknown> & { documentId: string; week_start: string; school_name: string | null };

/** Menus : semaine du 14 septembre (à dupliquer), une autre école la semaine du 21 */
function menus(): MockMenu[] {
  const meal = (day: string, main: string, extra: Record<string, unknown> = {}) => ({
    day,
    starter: null,
    main_course: main,
    side_dish: null,
    dairy: null,
    dessert: null,
    snack: null,
    labels: null,
    ...extra,
  });
  return [
    {
      documentId: 'cm-14',
      week_start: '2026-09-14',
      school_name: null,
      menu_mode: 'manual',
      menu_image: null,
      menu_pdf: null,
      meals: [
        meal('lundi', 'Hachis parmentier', { starter: 'Carottes râpées', labels: { starter: ['bio'] } }),
        meal('mardi', 'Poisson pané'),
        meal('jeudi', 'Omelette', { labels: { main: ['vegetarien'] } }),
        meal('vendredi', 'Poulet rôti'),
      ],
    },
    {
      documentId: 'cm-jf',
      week_start: '2026-09-21',
      school_name: 'École Jules-Ferry',
      menu_mode: 'manual',
      menu_image: null,
      menu_pdf: null,
      meals: [meal('lundi', 'Couscous')],
    },
  ];
}

export type MockWaste = Record<string, unknown> & { documentId: string; waste_type: string };

function wasteSchedules(): MockWaste[] {
  const base = (id: string, fields: Record<string, unknown>): MockWaste => ({
    documentId: id,
    waste_type: 'ordures-menageres',
    collection_day: null,
    frequency: 'hebdomadaire',
    month_rank: null,
    season_start_month: null,
    season_end_month: null,
    start_date: null,
    zone: null,
    notes: null,
    active: true,
    ...fields,
  });
  return [
    base('w-om', {
      waste_type: 'ordures-menageres',
      collection_day: 'mardi',
      notes: 'Sortir les bacs la veille au soir.',
    }),
    base('w-tri', { waste_type: 'tri-selectif', collection_day: 'jeudi', frequency: 'semaines-paires', zone: 'Bourg' }),
    base('w-verre', { waste_type: 'verre', frequency: 'apport-volontaire', zone: '4 points' }),
    base('w-verts', {
      waste_type: 'dechets-verts',
      collection_day: 'lundi',
      season_start_month: 4,
      season_end_month: 11,
    }),
    base('w-enc', { waste_type: 'encombrants', frequency: 'sur-rendez-vous' }),
  ];
}

export type MockAlert = Record<string, unknown> & {
  documentId: string;
  title: string;
  active: boolean;
  display_until: string | null;
};

/** Alertes, dates relatives à maintenant */
function alerts(): MockAlert[] {
  const at = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
  const base = (id: string, fields: Record<string, unknown>): MockAlert => ({
    documentId: id,
    title: '',
    message: '',
    severity: 'info',
    active: true,
    display_from: at(-1),
    display_until: at(3),
    link_url: null,
    link_label: null,
    alert_type: null,
    affected_area: null,
    start_date: null,
    end_date: null,
    createdAt: at(-1),
    updatedAt: at(-1),
    ...fields,
  });
  return [
    base('al-eau', {
      title: "Coupure d'eau rue des Lilas",
      message: "Intervention sur le réseau. Pensez à faire vos réserves d'eau.",
      severity: 'warning',
      alert_type: 'coupure-eau',
      affected_area: 'Rue des Lilas',
    }),
    base('al-marche', {
      title: 'Marché déplacé place de l’Église',
      message: 'Travaux sur la place du marché.',
      severity: 'info',
      alert_type: 'travaux',
      display_from: at(48),
      display_until: at(56),
    }),
    base('al-route', {
      title: 'Route de Nevers fermée après un accident',
      message: 'Déviation par la D12.',
      severity: 'critical',
      alert_type: 'deviation',
      display_from: at(-200),
      display_until: at(-190),
      active: false,
    }),
    base('al-canicule', {
      title: 'Vigilance orange canicule',
      message: 'Hydratez-vous.',
      severity: 'warning',
      alert_type: 'intemperie',
      display_from: at(-400),
      display_until: at(-380),
    }),
  ];
}

export type MockAssociation = Record<string, unknown> & { documentId: string; name: string; status: string };

function associations(): MockAssociation[] {
  const base = (id: string, fields: Record<string, unknown>): MockAssociation => ({
    documentId: id,
    description: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    website: null,
    address: null,
    logo: null,
    status: 'published',
    submission_source: 'manual',
    submitted_by_name: null,
    submitted_by_email: null,
    reviewed_at: null,
    rejection_reason: null,
    createdAt: '2026-03-01T10:00:00.000Z',
    name: '',
    category: 'autre',
    ...fields,
  });
  return [
    base('as-comite', {
      name: 'Comité des fêtes',
      category: 'culture',
      contact_name: 'Claire Martin',
      contact_email: 'comite@example.fr',
      contact_phone: '02 00 00 00 01',
      website: 'https://comite.example.fr',
    }),
    base('as-amis', { name: 'Les Amis du Vieux Bourg', category: 'culture', contact_email: 'amis@example.fr' }),
    base('as-restos', { name: 'Restos du cœur', category: 'social' }),
    base('as-jardins', {
      name: 'Les Jardins partagés de la Loire',
      category: 'environnement',
      status: 'pending',
      submission_source: 'public_form',
      description: 'Ateliers de jardinage, compost collectif.',
      contact_phone: '06 00 00 00 02',
      address: '12 chemin des Vignes',
      submitted_by_name: 'Hélène Garnier',
      submitted_by_email: 'h.garnier@example.org',
      createdAt: '2026-09-19T08:00:00.000Z',
    }),
    base('as-petanque', {
      name: 'Club de pétanque saint-aubinois',
      category: 'sport',
      status: 'pending',
      submission_source: 'public_form',
      submitted_by_name: 'René Dupont',
      submitted_by_email: null,
      createdAt: '2026-09-17T08:00:00.000Z',
    }),
  ];
}

export type MockMessage = Record<string, unknown> & {
  documentId: string;
  history: Array<Record<string, unknown>>;
  opened_at: string | null;
  status: string;
};

/** Messages : dates relatives à maintenant (le délai RGPD se calcule depuis la réception) */
function messages(): MockMessage[] {
  const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
  const base = (id: string, fields: Record<string, unknown>, hours: number): MockMessage => ({
    documentId: id,
    email: `${id.slice(2)}@example.fr`,
    phone: null,
    response: null,
    responded_at: null,
    acknowledgment_sent: true,
    attachments: [],
    opened_at: null,
    status: 'received',
    createdAt: ago(hours),
    history: [
      { type: 'received', at: ago(hours) },
      { type: 'acknowledged', at: ago(hours) },
    ],
    ...fields,
  });
  return [
    base(
      'm-dubois',
      {
        first_name: 'Marc',
        last_name: 'Dubois',
        email: 'marc.dubois@example.fr',
        phone: '06 00 00 00 01',
        subject: "Demande d'accès à mes données personnelles",
        message:
          'Bonjour,\nEn application de l’article 15 du RGPD, je souhaite obtenir une copie de mes données.\nCordialement,\nMarc Dubois',
        category: 'rgpd',
        reference_number: 'SVE-2026-0042',
        attachments: [
          {
            id: 501,
            name: 'piece-identite.pdf',
            ext: '.pdf',
            mime: 'application/pdf',
            size: 620,
            url: '/uploads/piece-identite.pdf',
          },
        ],
      },
      2,
    ),
    base(
      'm-petit',
      {
        first_name: 'Nathalie',
        last_name: 'Petit',
        subject: "Nid-de-poule dangereux à l'angle de la rue du Stade",
        message: 'Un trou profond devant l’école.',
        category: 'voirie',
        reference_number: 'SVE-2026-0041',
      },
      26,
    ),
    base(
      'm-benali',
      {
        first_name: 'Karim',
        last_name: 'Benali',
        subject: "Certificat d'urbanisme pour la parcelle AB 214",
        message: 'Bonjour, quel délai ?',
        category: 'urbanisme',
        reference_number: 'SVE-2026-0039',
      },
      96,
    ),
    base(
      'm-girard',
      {
        first_name: 'Paul',
        last_name: 'Girard',
        subject: 'Éclairage public en panne allée des Tilleuls',
        message: 'Depuis une semaine.',
        category: 'voirie',
        reference_number: 'SVE-2026-0037',
        status: 'in_progress',
        opened_at: ago(160),
      },
      168,
    ),
    base(
      'm-moreau',
      {
        first_name: 'Sandrine',
        last_name: 'Moreau',
        subject: "Inscription à la cantine en cours d'année",
        message: 'Est-ce possible ?',
        category: 'general',
        reference_number: 'SVE-2026-0036',
        status: 'resolved',
        opened_at: ago(260),
        response: 'Oui, en mairie.',
        responded_at: ago(250),
      },
      264,
    ),
    base(
      'm-roux',
      {
        first_name: 'Julie',
        last_name: 'Roux',
        subject: 'Suppression de mon compte newsletter et de mes données',
        message: 'Merci de supprimer mes données.',
        category: 'rgpd',
        reference_number: 'SVE-2026-0021',
        status: 'in_progress',
        opened_at: ago(900),
      },
      960,
    ),
  ];
}

export interface MockSubscriber {
  documentId: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscribed_at: string;
  active: boolean;
  unsubscribed_at: string | null;
}

/** 45 abonnés : Hélène Garnier la plus récente, une adresse désabonnée, des noms manquants */
function subscribers(): MockSubscriber[] {
  const list: MockSubscriber[] = [
    {
      documentId: 's-garnier',
      email: 'h.garnier@example.org',
      first_name: 'Hélène',
      last_name: 'Garnier',
      subscribed_at: '2026-09-20T08:00:00.000Z',
      active: true,
      unsubscribed_at: null,
    },
    {
      documentId: 's-ancienne',
      email: 'ancienne.adresse@example.net',
      first_name: null,
      last_name: null,
      subscribed_at: '2024-01-14T08:00:00.000Z',
      active: false,
      unsubscribed_at: '2025-06-02T10:00:00.000Z',
    },
  ];
  for (let index = 1; index <= 43; index++) {
    list.push({
      documentId: `s-${index}`,
      email: `habitant${index}@example.fr`,
      first_name: index % 5 === 0 ? null : `Prénom${index}`,
      last_name: index % 5 === 0 ? null : `Nom${index}`,
      subscribed_at: new Date(Date.UTC(2026, 8, 19) - index * 5 * 86_400_000).toISOString(),
      active: index % 9 !== 0,
      unsubscribed_at: index % 9 !== 0 ? null : '2026-05-01T10:00:00.000Z',
    });
  }
  return list;
}

export const NAVIGATION = {
  main: [
    { type: 'section', section: 'actualites', label: null },
    {
      type: 'group',
      label: 'Vie pratique',
      children: [
        { type: 'page', pageDocumentId: 'p-salle', label: null },
        { type: 'section', section: 'dechets', label: null },
      ],
    },
    { type: 'section', section: 'agenda', label: null },
  ],
  footer: [{ type: 'external', url: 'https://www.service-public.fr', label: 'Service-Public' }],
};

export async function mockApi(page: Page, options: MockOptions = {}) {
  const {
    user = 'admin',
    publication = 'pending',
    loggedIn = true,
    failPageSaves = false,
    previewUnavailable = false,
    pageSet = 'one',
    failPublishFor = [],
    navigation = NAVIGATION,
    theme = 'institutionnel',
    documentSet = 'few',
    emptyTeam = false,
    subscriberSet = 'some',
    failExport = false,
    messageSet = 'some',
    failReply = false,
    associationSet = 'some',
    failRejectEmail = false,
    alertSet = 'some',
    wasteSet = 'some',
    mediaSet = 'some',
    failUploadFor,
    pageImageWithoutAlt = false,
  } = options;
  const canteen = menus();
  const library = mediaSet === 'none' ? [] : mediaItems();

  // Usages : le fichier 501 (salle des fêtes) est utilisé par une page et une actualité
  const usage: Record<number, Array<{ uid: string; documentId: string; label: string; path: string }>> = {
    501: [
      {
        uid: 'api::article.article',
        documentId: 'a-forum',
        label: 'Actualité — Forum des associations',
        path: '/actualites/a-forum',
      },
      {
        uid: 'api::page.page',
        documentId: 'p-salle',
        label: 'Page — Location de la salle des fêtes',
        path: '/pages/p-salle',
      },
    ],
  };
  const calls: string[] = [];
  const bodies: Array<{ call: string; type?: ContentType; body: { data: Record<string, unknown> } }> = [];
  const posts: Record<string, unknown[]> = {};
  let state = publication;
  const pages: Record<string, MockPage> =
    pageSet === 'many' ? manyPages() : pageSet === 'none' ? {} : structuredClone(PAGES);
  if (pageImageWithoutAlt && pages['p-salle']) {
    const forum = library.find((item) => item.documentId === 'mi-2')!;
    pages['p-salle'].blocks.push({
      __component: 'blocks.image',
      id: 30,
      image: structuredClone(forum.file),
      caption: null,
      width: 'normal',
    });
  }  // Contenus par type (API Strapi), version en ligne et modifications depuis
  const stores: Record<ContentType, Record<string, Record<string, unknown>>> = {
    pages: pages as unknown as Record<string, Record<string, unknown>>,
    articles: structuredClone(ARTICLES),
    evenements: structuredClone(EVENTS),
    'official-documents': officialDocuments(documentSet === 'many'),
  };
  const team = emptyTeam ? [] : (structuredClone(TEAM) as Array<Record<string, unknown>>);
  const newsletter = subscriberSet === 'none' ? [] : subscribers();
  const inbox = messageSet === 'none' ? [] : messages();
  const directory = associationSet === 'none' ? [] : associations();
  const alertStore = alertSet === 'none' ? [] : alerts();
  const waste = wasteSet === 'none' ? [] : wasteSchedules();
  let uploads = 0;
  const published = new Set<string>(Object.keys(pages).filter((id) => !isDraftOnly(id) && !pages[id]!.scheduled_at));
  const publishedByType: Record<ContentType, Set<string>> = {
    pages: published,
    articles: new Set(['a-dechetterie']),
    evenements: new Set(['e-fete', 'e-forum']),
    'official-documents': new Set(Object.keys(stores['official-documents']).filter((id) => !id.endsWith('-2'))),
  };
  const modifiedByType: Record<ContentType, Set<string>> = {
    pages: new Set(),
    articles: new Set(),
    evenements: new Set(),
    'official-documents': new Set(),
  };

  // Session côté « serveur » (cookie HttpOnly en vrai) : l'admin ne voit jamais de jeton
  let session = loggedIn;
  const site = {
    documentId: SITE.documentId,
    updatedAt: '2026-09-22T14:30:00.000Z',
    theme,
    comarquage_enabled: true,
    open_data_enabled: false,
    navigation_config: structuredClone(navigation) as unknown,
    waste_notes: 'Déchetterie ouverte du mardi au samedi.' as string | null,
  };
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
      const settings = JSON.parse(form.get('settings') ?? '{}') as {
        navigation_config?: { main: Array<{ label?: string | null; section?: string }> };
      };
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
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    // Comme Strapi : toute écriture de l'admin porte l'en-tête de sécurité
    if (method !== 'GET' && route.request().headers()['x-communeo-csrf'] !== '1') {
      return json({ error: { status: 403, message: 'Requête refusée : en-tête de sécurité manquant' } }, 403);
    }
    if (method === 'POST' && !url.pathname.endsWith('/upload'))
      (posts[url.pathname] ??= []).push(route.request().postDataJSON());
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
    if (url.pathname === '/api/user-management/invitation')
      return json(LINKS[url.searchParams.get('jeton') ?? ''] ?? { status: 'invalid' });
    if (url.pathname === '/api/user-management/accept-invitation') {
      const body = route.request().postDataJSON() as { password: string };
      if (body.password.length < 10)
        return json({ error: { status: 400, message: 'Le mot de passe doit contenir au moins 10 caractères' } }, 400);
      passwords.add(body.password);
      return json({ ok: true });
    }
    if (
      url.pathname === '/api/user-management/request-invitation' ||
      url.pathname === '/api/user-management/forgot-password'
    )
      return json({ ok: true });

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
    if (url.pathname === '/api/user-management/admins')
      return json({ data: [{ name: 'Sophie Leroy' }, { name: 'Claire Martin' }] });
    if (url.pathname === '/api/site-management' && USERS[user].municipality_role === 'super_admin')
      return json({ data: SITES });
    const siteMatch = /^\/api\/site-management\/([^/]+)$/.exec(url.pathname);
    if (siteMatch && USERS[user].municipality_role === 'super_admin') {
      const site = SITES.find((candidate) => candidate.documentId === siteMatch[1]);
      return site ? json({ data: site }) : json({ error: { status: 404, message: 'Site not found' } }, 404);
    }
    if (url.pathname === '/api/deployment/state') {
      return json({
        state,
        pendingCount: state === 'pending' ? 3 : 0,
        step: state === 'running' ? 'rendering' : null,
        reference: null,
      });
    }
    if (url.pathname === '/api/deployment/trigger' && method === 'POST') {
      state = 'running';
      return json({ status: 'queued', queued: true }, 202);
    }
    if (url.pathname === '/api/publication/official-documents/years') {
      const counts = new Map<number, number>();
      for (const doc of Object.values(stores['official-documents']))
        if (doc.year) counts.set(doc.year as number, (counts.get(doc.year as number) ?? 0) + 1);
      return json({ data: [...counts].sort(([a], [b]) => b - a).map(([year, count]) => ({ year, count })) });
    }
    if (url.pathname === '/api/media-items/upload' && method === 'POST') {
      const body = route.request().postDataBuffer()?.toString('latin1') ?? '';
      const name = /filename="([^"]+)"/.exec(body)?.[1] ?? 'fichier';
      const mime = /Content-Type: ([^\r\n]+)/.exec(body)?.[1] ?? 'application/octet-stream';
      uploads += 1;
      const file = {
        id: 1000 + uploads,
        name,
        ext: name.slice(name.lastIndexOf('.')),
        mime,
        size: 42,
        url: `/uploads/${name}`,
      };
      posts['upload'] = [...(posts['upload'] ?? []), file];
      if (failUploadFor === name)
        return json(
          { error: { status: 400, message: 'Le contenu du fichier ne correspond pas à un fichier PNG.' } },
          400,
        );
      // Champ texte en UTF-8 (le corps est lu en latin-1 pour les octets du fichier)
      const folder =
        /name="folder"\r\n\r\n([^\r]*)/.exec(route.request().postDataBuffer()?.toString('utf8') ?? '')?.[1] ?? null;
      const item: MockMedia = {
        documentId: `m-${uploads}`,
        name,
        folder,
        uploaded_by_name: 'Sophie Leroy',
        createdAt: new Date().toISOString(),
        file: { ...file, alternativeText: null, caption: null, credit: null, width: null, height: null },
      };
      library.unshift(item);
      return json({ data: item }, 201);
    }
    if (url.pathname === '/api/newsletter-subscribers/stats') {
      const active = newsletter.filter((item) => item.active);
      return json({
        data: {
          total: newsletter.length,
          active: active.length,
          thisMonth: active.filter((item) => item.subscribed_at >= '2026-09-01').length,
        },
      });
    }
    if (url.pathname === '/api/newsletter-subscribers/export') {
      if (failExport) return json({ error: { status: 500, message: 'Internal Server Error' } }, 500);
      const csv =
        '\uFEFF"E-mail";"Prénom";"Nom";"Inscrit le";"État";"Désabonné le"\r\n' +
        newsletter
          .map(
            (item) =>
              `"${item.email}";"${item.first_name ?? ''}";"${item.last_name ?? ''}";"";"${item.active ? 'Actif' : 'Désabonné'}";""`,
          )
          .join('\r\n');
      return route.fulfill({ status: 200, contentType: 'text/csv; charset=utf-8', body: csv });
    }
    const unsubscribeMatch = /^\/api\/newsletter-subscribers\/([^/]+)\/unsubscribe$/.exec(url.pathname);
    if (unsubscribeMatch && method === 'POST') {
      const subscriber = newsletter.find((item) => item.documentId === unsubscribeMatch[1]);
      if (!subscriber) return json({ error: { status: 404, message: 'Not Found' } }, 404);
      Object.assign(subscriber, { active: false, unsubscribed_at: new Date().toISOString() });
      return json({ data: subscriber });
    }
    if (url.pathname === '/api/newsletter-subscribers') {
      const q = url.searchParams.get('filters[$or][0][email][$containsi]')?.toLowerCase();
      const active = url.searchParams.get('filters[active][$eq]');
      const rows = newsletter
        .filter(
          (item) =>
            !q || [item.email, item.first_name, item.last_name].some((value) => value?.toLowerCase().includes(q)),
        )
        .filter((item) => active === null || String(item.active) === active)
        .sort((a, b) => b.subscribed_at.localeCompare(a.subscribed_at));
      const pageNumber = Number(url.searchParams.get('pagination[page]') ?? 1);
      const pageSize = Number(url.searchParams.get('pagination[pageSize]') ?? 25);
      return json({
        data: rows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
        meta: {
          pagination: { page: pageNumber, pageSize, total: rows.length, pageCount: Math.ceil(rows.length / pageSize) },
        },
      });
    }
    const teamMatch = /^\/api\/team-members(?:\/([^/]+))?$/.exec(url.pathname);
    if (teamMatch) {
      const id = teamMatch[1];
      if (method === 'GET')
        return json({
          data: [...team].sort((a, b) => ((a.display_order as number) ?? 999) - ((b.display_order as number) ?? 999)),
          meta: { pagination: { page: 1, pageCount: 1, total: team.length } },
        });
      if (method === 'DELETE' && id) {
        team.splice(
          team.findIndex((member) => member.documentId === id),
          1,
        );
        return route.fulfill({ status: 204 });
      }
      const body = route.request().postDataJSON() as { data: Record<string, unknown> };
      bodies.push({ call: `${method} team`, body });
      const photoId = body.data.photo;
      const data = {
        ...body.data,
        ...(photoId !== undefined
          ? {
              photo: photoId
                ? { id: photoId, name: 'photo.png', ext: '.png', size: 42, url: '/uploads/photo.png' }
                : null,
            }
          : {}),
      };
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
        if (!doc || (status === 'published' && !online.has(id)))
          return json({ data: null, error: { status: 404, message: 'Not Found' } }, 404);
        return json({ data: status === 'published' ? { ...doc, publishedAt: '2026-09-21T08:00:00.000Z' } : doc });
      }
      if (method === 'POST' || method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: `${method} ${status ?? 'draft'}`, type, body });
        if (failPageSaves) return json({ error: { status: 500, message: 'Erreur du serveur' } }, 500);
        if (status === 'published' && id && failPublishFor.includes(id))
          return json({ error: { status: 400, message: 'Le bloc 1 (Texte) est vide.' } }, 400);
        const documentId = id ?? `${type.charAt(0)}-nouvelle`;
        const slug =
          (body.data.slug as string) ||
          String(body.data.title ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const base = store[documentId] ?? (type === 'pages' ? PAGES['p-salle']! : {});
        const doc = { ...base, ...body.data, documentId, slug, updatedAt: new Date().toISOString() } as Record<
          string,
          unknown
        >;
        // Comme le backend : une actualité reçoit sa date à la première publication
        if (type === 'articles' && status === 'published' && !doc.publication_date)
          doc.publication_date = new Date().toISOString();
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
            const state = publishedByType[type].has(documentId)
              ? modifiedByType[type].has(documentId)
                ? 'modified'
                : 'published'
              : 'draft';
            return [documentId, { state, scheduledAt: doc.scheduled_at ?? null }];
          }),
        ),
      });
    }
    const unpublish = /^\/api\/publication\/(pages|articles|evenements|official-documents)\/([^/]+)\/unpublish$/.exec(
      url.pathname,
    );
    if (unpublish && method === 'POST') {
      const type = unpublish[1] as ContentType;
      publishedByType[type].delete(unpublish[2]!);
      modifiedByType[type].delete(unpublish[2]!);
      return json({ data: { documentId: unpublish[2], state: 'draft' } });
    }
    if (url.pathname === '/api/preview/token' && method === 'POST') {
      if (previewUnavailable)
        return json({ error: { status: 503, message: "Preview indisponible : PREVIEW_SECRET n'est pas défini" } }, 503);
      const body = route.request().postDataJSON() as { type?: string; documentId?: string };
      const type: ContentType =
        body.type === 'article' ? 'articles' : body.type === 'evenement' ? 'evenements' : 'pages';
      const prefix = type === 'articles' ? 'actualites/' : type === 'evenements' ? 'agenda/' : '';
      const slug = (body.documentId && (stores[type][body.documentId]?.slug as string | undefined)) ?? '';
      return json({
        url: `http://preview.test/${slug ? prefix : ''}${slug}?token=jeton-signe`,
        expiresAt: new Date(Date.now() + 1_800_000).toISOString(),
      });
    }
    if (url.pathname === '/api/contact-submissions') {
      const q = url.searchParams.get('filters[$or][0][first_name][$containsi]')?.toLowerCase();
      const category = url.searchParams.get('filters[category][$eq]');
      const statusFilter = url.searchParams.get('filters[status][$eq]');
      const rows = inbox
        .filter(
          (item) =>
            !q ||
            ['first_name', 'last_name', 'subject', 'reference_number', 'email'].some((field) =>
              String(item[field]).toLowerCase().includes(q),
            ),
        )
        .filter((item) => !url.searchParams.has('filters[opened_at][$null]') || !item.opened_at)
        .filter((item) => !category || item.category === category)
        .filter((item) => !statusFilter || item.status === statusFilter)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      const pageNumber = Number(url.searchParams.get('pagination[page]') ?? 1);
      const pageSize = Number(url.searchParams.get('pagination[pageSize]') ?? 25);
      return json({
        data: rows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
        meta: {
          pagination: { page: pageNumber, pageSize, total: rows.length, pageCount: Math.ceil(rows.length / pageSize) },
        },
      });
    }
    if (url.pathname === '/api/media-items/folders') {
      const counts = new Map<string, number>();
      for (const item of library) if (item.folder) counts.set(item.folder, (counts.get(item.folder) ?? 0) + 1);
      return json({
        data: {
          total: library.length,
          bytes: library.length * 1200 * 1024,
          missingAlt: library.filter((item) => item.file.mime.startsWith('image/') && !item.file.alternativeText)
            .length,
          folders: [...counts]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        },
      });
    }
    if (url.pathname === '/api/media-items/usage')
      return json({ data: usage[Number(url.searchParams.get('file'))] ?? [] });
    if (url.pathname === '/api/media-items' && method === 'GET') {
      const q = url.searchParams.get('filters[name][$containsi]')?.toLowerCase();
      const folder = url.searchParams.get('filters[folder][$eq]');
      const fileId = url.searchParams.get('filters[file][id][$eq]');
      const images = url.searchParams.get('filters[file][mime][$startsWith]') === 'image/';
      const documents = url.searchParams.has('filters[file][mime][$notContainsi]');
      const missingAlt = url.searchParams.has('filters[$or][0][file][alternativeText][$null]');
      const rows = library
        .filter((item) => !q || item.name.toLowerCase().includes(q))
        .filter((item) => !folder || item.folder === folder)
        .filter((item) => !fileId || item.file.id === Number(fileId))
        .filter((item) => !images || item.file.mime.startsWith('image/'))
        .filter((item) => !documents || !item.file.mime.startsWith('image/'))
        .filter((item) => !missingAlt || !item.file.alternativeText);
      const pageNumber = Number(url.searchParams.get('pagination[page]') ?? 1);
      const pageSize = Number(url.searchParams.get('pagination[pageSize]') ?? 25);
      return json({
        data: rows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
        meta: {
          pagination: {
            page: pageNumber,
            pageSize,
            total: rows.length,
            pageCount: Math.max(1, Math.ceil(rows.length / pageSize)),
          },
        },
      });
    }
    const mediaMatch = /^\/api\/media-items\/([^/]+)$/.exec(url.pathname);
    if (mediaMatch) {
      const item = library.find((entry) => entry.documentId === mediaMatch[1]);
      if (!item) return json({ error: { status: 404, message: 'Not Found' } }, 404);
      if (method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Record<string, string | null> };
        bodies.push({ call: `PUT media ${item.documentId}`, body });
        const { alt_text, caption, credit, ...rest } = body.data;
        Object.assign(item, rest);
        Object.assign(item.file, {
          ...(alt_text !== undefined ? { alternativeText: alt_text || null } : {}),
          ...(caption !== undefined ? { caption: caption || null } : {}),
          ...(credit !== undefined ? { credit: credit || null } : {}),
        });
        return json({ data: item });
      }
      if (method === 'DELETE') {
        const used = usage[item.file.id] ?? [];
        if (used.length)
          return json(
            {
              error: {
                status: 409,
                message: `Ce fichier est utilisé dans ${used.length} contenus : retirez-le d'abord.`,
                details: { usages: used },
              },
            },
            409,
          );
        library.splice(library.indexOf(item), 1);
        return route.fulfill({ status: 204 });
      }
      return json({ data: item });
    }
    if (url.pathname === '/api/school-menus') {
      if (method === 'POST') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: 'POST menu', body });
        const created = {
          documentId: `cm-${canteen.length + 1}`,
          menu_image: null,
          menu_pdf: null,
          ...(body.data as { week_start: string; school_name: string | null }),
        };
        canteen.push(created);
        return json({ data: created }, 201);
      }
      const week = url.searchParams.get('filters[week_start][$eq]');
      const school = url.searchParams.get('filters[school_name][$eq]');
      const rows = canteen
        .filter((menu) => !week || menu.week_start === week)
        .filter((menu) =>
          school !== null
            ? menu.school_name === school
            : !url.searchParams.has('filters[school_name][$null]') || !menu.school_name,
        );
      return json({ data: rows, meta: { pagination: { page: 1, pageSize: 100, total: rows.length, pageCount: 1 } } });
    }
    const menuMatch = /^\/api\/school-menus\/([^/]+)$/.exec(url.pathname);
    if (menuMatch) {
      const item = canteen.find((entry) => entry.documentId === menuMatch[1]);
      if (!item) return json({ error: { status: 404, message: 'Not Found' } }, 404);
      if (method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: `PUT menu ${item.documentId}`, body });
        Object.assign(item, body.data);
      }
      if (method === 'DELETE') {
        canteen.splice(canteen.indexOf(item), 1);
        return route.fulfill({ status: 204 });
      }
      return json({ data: item });
    }
    if (url.pathname === '/api/waste-schedules') {
      if (method === 'POST') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: 'POST waste', body });
        const created = { documentId: `w-${waste.length + 1}`, ...(body.data as { waste_type: string }) };
        waste.push(created);
        return json({ data: created }, 201);
      }
      return json({ data: waste, meta: { pagination: { page: 1, pageSize: 100, total: waste.length, pageCount: 1 } } });
    }
    const wasteMatch = /^\/api\/waste-schedules\/([^/]+)$/.exec(url.pathname);
    if (wasteMatch) {
      const item = waste.find((entry) => entry.documentId === wasteMatch[1]);
      if (!item) return json({ error: { status: 404, message: 'Not Found' } }, 404);
      if (method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: `PUT waste ${item.documentId}`, body });
        Object.assign(item, body.data);
      }
      if (method === 'DELETE') {
        waste.splice(waste.indexOf(item), 1);
        return route.fulfill({ status: 204 });
      }
      return json({ data: item });
    }
    if (url.pathname === '/api/alertes' && method === 'GET') {
      return json({
        data: alertStore,
        meta: { pagination: { page: 1, pageSize: 100, total: alertStore.length, pageCount: 1 } },
      });
    }
    if (url.pathname === '/api/alertes' && method === 'POST') {
      const body = route.request().postDataJSON() as { data: Record<string, unknown> };
      bodies.push({ call: 'POST alertes', body });
      const created = {
        documentId: `al-${alertStore.length + 1}`,
        createdAt: new Date().toISOString(),
        ...(body.data as { title: string; active: boolean; display_until: string }),
      };
      alertStore.unshift(created);
      return json({ data: created }, 201);
    }
    const alertMatch = /^\/api\/alertes\/([^/]+)$/.exec(url.pathname);
    if (alertMatch && alertMatch[1] !== 'public') {
      const item = alertStore.find((entry) => entry.documentId === alertMatch[1]);
      if (!item) return json({ error: { status: 404, message: 'Not Found' } }, 404);
      if (method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: `PUT alertes ${item.documentId}`, body });
        Object.assign(item, body.data);
      }
      if (method === 'DELETE') {
        alertStore.splice(alertStore.indexOf(item), 1);
        return route.fulfill({ status: 204 });
      }
      return json({ data: item });
    }
    if (url.pathname === '/api/associations' && method === 'GET') {
      const statusFilter = url.searchParams.get('filters[status][$eq]');
      const q = url.searchParams.get('filters[name][$containsi]')?.toLowerCase();
      const [field, order] = (url.searchParams.get('sort[0]') ?? 'name:asc').split(':') as [string, string];
      const rows = directory
        .filter((item) => !statusFilter || item.status === statusFilter)
        .filter((item) => !q || item.name.toLowerCase().includes(q))
        .sort((a, b) => String(a[field]).localeCompare(String(b[field]), 'fr') * (order === 'desc' ? -1 : 1));
      const pageNumber = Number(url.searchParams.get('pagination[page]') ?? 1);
      const pageSize = Number(url.searchParams.get('pagination[pageSize]') ?? 25);
      return json({
        data: rows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
        meta: {
          pagination: { page: pageNumber, pageSize, total: rows.length, pageCount: Math.ceil(rows.length / pageSize) },
        },
      });
    }
    if (url.pathname === '/api/associations' && method === 'POST') {
      const body = route.request().postDataJSON() as { data: Record<string, unknown> };
      bodies.push({ call: 'POST associations', body });
      const created: MockAssociation = {
        documentId: `as-${directory.length + 1}`,
        createdAt: new Date().toISOString(),
        ...(body.data as { name: string; status: string }),
        logo: null,
      };
      directory.push(created);
      return json({ data: created }, 201);
    }
    const associationMatch = /^\/api\/associations\/([^/]+)(?:\/(publish|reject))?$/.exec(url.pathname);
    if (associationMatch) {
      const item = directory.find((entry) => entry.documentId === associationMatch[1]);
      if (!item) return json({ error: { status: 404, message: 'Not Found' } }, 404);
      const now = new Date().toISOString();
      if (associationMatch[2] === 'publish') {
        Object.assign(item, { status: 'published', reviewed_at: now, rejection_reason: null });
        return json({ data: item });
      }
      if (associationMatch[2] === 'reject') {
        const { reason } = route.request().postDataJSON() as { reason: string };
        Object.assign(item, { status: 'rejected', reviewed_at: now, rejection_reason: reason });
        return json({ data: item, emailed: !!item.submitted_by_email && !failRejectEmail });
      }
      if (method === 'PUT') {
        const body = route.request().postDataJSON() as { data: Record<string, unknown> };
        bodies.push({ call: 'PUT associations', body });
        Object.assign(item, body.data, {
          logo: body.data.logo
            ? { id: body.data.logo, name: 'logo.png', ext: '.png', size: 12, url: '/uploads/logo.png' }
            : null,
        });
        return json({ data: item });
      }
      if (method === 'DELETE') {
        directory.splice(directory.indexOf(item), 1);
        return route.fulfill({ status: 204 });
      }
      return json({ data: item });
    }
    const messageMatch = /^\/api\/contact-submissions\/([^/]+)(?:\/(open|reply))?$/.exec(url.pathname);
    if (messageMatch) {
      const item = inbox.find((entry) => entry.documentId === messageMatch[1]);
      if (!item) return json({ error: { status: 404, message: 'Not Found' } }, 404);
      const now = new Date().toISOString();
      const by = `${USERS[user].first_name} ${USERS[user].last_name}`;
      if (messageMatch[2] === 'open') {
        if (!item.opened_at)
          Object.assign(item, { opened_at: now, history: [...item.history, { type: 'opened', at: now, by }] });
        return json({ data: item });
      }
      if (messageMatch[2] === 'reply') {
        if (failReply)
          return json(
            {
              error: {
                status: 502,
                message: "La réponse n'a pas pu être envoyée par e-mail. Elle n'est pas enregistrée : réessayez.",
              },
            },
            502,
          );
        const body = route.request().postDataJSON() as {
          message: string;
          resolve?: boolean;
          attachmentFileId?: number;
        };
        const status = body.resolve === false ? (item.status === 'received' ? 'in_progress' : item.status) : 'resolved';
        Object.assign(item, {
          response: body.message,
          responded_at: now,
          status,
          history: [
            ...item.history,
            {
              type: 'replied',
              at: now,
              by,
              message: body.message,
              ...(body.attachmentFileId ? { attachment: 'export.pdf' } : {}),
            },
          ],
        });
        return json({ data: item });
      }
      if (method === 'PUT') {
        const next = (route.request().postDataJSON() as { data: { status: string } }).data.status;
        if (next !== item.status)
          Object.assign(item, {
            history: [...item.history, { type: 'status', at: now, by, from: item.status, to: next }],
            status: next,
          });
        return json({ data: item });
      }
      if (method === 'DELETE') {
        inbox.splice(inbox.indexOf(item), 1);
        return route.fulfill({ status: 204 });
      }
      return json({ data: item });
    }
    return json({ error: { status: 404, message: 'Not Found' } }, 404);
  });

  return {
    site,
    team,
    newsletter,
    inbox,
    directory,
    alertStore,
    waste,
    canteen,
    library,
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
  const all = (prefix: string) =>
    [...params.entries()].filter(([key]) => key.startsWith(prefix)).map(([, value]) => value);
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
  rows = rows.sort(
    (a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? ''), 'fr') * (order === 'desc' ? -1 : 1),
  );
  const page = Number(params.get('pagination[page]') ?? 1);
  const pageSize = Number(params.get('pagination[pageSize]') ?? 25);
  const data = rows
    .slice((page - 1) * pageSize, page * pageSize)
    .map(({ blocks: _blocks, ...row }) => ({ featured_image: null, image: null, ...row }));
  return {
    data,
    meta: { pagination: { page, pageSize, total: rows.length, pageCount: Math.ceil(rows.length / pageSize) } },
  };
}
