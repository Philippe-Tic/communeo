/**
 * Saint-Aubin-sur-Loire (commune fictive, 3 240 habitants) : contenus du brief des maquettes.
 * Couvre les cas limites du brief §8 : titres longs, contenus sans image, événement sur plusieurs
 * jours, alerte urgente, association sans logo, élus sans photo, cantine en PDF.
 */
import type {
  Alerte,
  Article,
  Association,
  Evenement,
  OfficialDocument,
  Page,
  SchoolMenu,
  Site,
  TeamMember,
  WasteSchedule,
} from '@communeo/core';
import { a, b, doc, h2, h3, media, ol, p, rich, ul } from './builders';

// --- Site ----------------------------------------------------------------------------------------

const weekdays = [
  { open: '09:00', close: '12:00' },
  { open: '14:00', close: '17:30' },
];

export const site = (logo: 'horizontal' | 'blason' = 'horizontal') =>
  doc('site-saint-aubin', {
    name: 'Saint-Aubin-sur-Loire',
    slug: 'saint-aubin-sur-loire',
    theme: 'institutionnel',
    logo: media(logo === 'blason' ? 'logo-blason.svg' : 'logo-horizontal.svg', {
      alt: 'Saint-Aubin-sur-Loire',
      width: logo === 'blason' ? 200 : 480,
      height: logo === 'blason' ? 240 : 120,
    }),
    favicon: null,
    contact_mail: 'contact@saint-aubin-sur-loire.fr',
    contact_phone: '02 41 00 00 00',
    address: '1 place de la Mairie, 49000 Saint-Aubin-sur-Loire',
    live_url: 'https://saint-aubin-sur-loire.fr',
    custom_domain: 'saint-aubin-sur-loire.fr',
    domain_status: 'verified',
    domain_type: 'apex',
    domain_configured_at: null,
    ssl_enabled: true,
    open_data_enabled: true,
    open_data_url: 'https://www.data.gouv.fr/fr/organizations/commune-de-saint-aubin-sur-loire/',
    open_data_platform: 'data-gouv-fr',
    auto_deploy_enabled: true,
    auto_deploy_delay: 300,
    code_insee: '49269',
    comarquage_enabled: true,
    comarquage_audiences: ['particuliers', 'associations', 'professionnels'],
    infos_pratiques: {
      id: 1,
      population: 3240,
      latitude: 47.39,
      longitude: -0.52,
      contact_form_intro: 'Posez votre question aux services de la mairie. Nous vous répondons sous 5 jours ouvrés.',
      opening_hours: {
        days: {
          monday: weekdays,
          tuesday: weekdays,
          wednesday: [{ open: '09:00', close: '12:00' }],
          thursday: weekdays,
          friday: weekdays,
          saturday: [{ open: '09:00', close: '12:00' }],
          sunday: [],
        },
        closures: [
          { date: '2026-11-11', label: 'Armistice' },
          { date: '2026-12-24', label: 'Veille de Noël' },
        ],
        note: 'Fermé le mercredi après-midi',
      },
    },
    mentions_legales: {
      id: 1,
      siret: '214 902 690 00017',
      publication_director: 'Claire Martin',
      publication_director_title: 'Maire',
      hebergeur_name: 'Netlify, Inc.',
      hebergeur_address: '101 2nd Street, San Francisco, CA 94105, États-Unis',
      hebergeur_phone: null,
      credits: rich(p('Photographies : service communication de la mairie, sauf mention contraire.')),
      mentions_legales_extra: null,
    },
    rgpd: {
      id: 1,
      rgpd_policy: rich(
        h2('Données collectées'),
        p('La commune collecte uniquement les données nécessaires au traitement de vos demandes : nom, prénom, adresse e-mail et, si vous le souhaitez, numéro de téléphone.'),
        h2('Durée de conservation'),
        p('Les demandes sont conservées 3 ans à compter de leur clôture, puis supprimées.'),
        h2('Vos droits'),
        p('Vous pouvez accéder à vos données, les rectifier ou demander leur effacement depuis la page ', a('Exercer mes droits', '/exercer-mes-droits'), '.'),
      ),
      dpo_name: 'Centre de gestion de Maine-et-Loire',
      dpo_email: 'dpo@cdg49.fr',
      dpo_phone: '02 41 00 00 10',
    },
    accessibilite: {
      id: 1,
      accessibility_level: 'partiellement-conforme',
      accessibility_declaration: rich(
        p('La commune de Saint-Aubin-sur-Loire s’engage à rendre son site internet accessible conformément à l’article 47 de la loi n° 2005-102 du 11 février 2005.'),
        h2('État de conformité'),
        p('Le site est ', b('partiellement conforme'), ' avec le référentiel général d’amélioration de l’accessibilité (RGAA), version 4.1.'),
        h2('Contenus non accessibles'),
        ul('Certains documents PDF anciens ne sont pas balisés.', 'Les plans de la zone de collecte sont des images sans alternative détaillée.'),
      ),
      accessibility_schema_url: 'https://saint-aubin-sur-loire.fr/documents/schema-accessibilite-2026-2028',
      accessibility_action_plan_url: 'https://saint-aubin-sur-loire.fr/documents/plan-action-2026',
    },
    social_links: [
      { id: 1, platform: 'facebook', url: 'https://www.facebook.com/saintaubinsurloire', label: null, icon: null },
      { id: 2, platform: 'instagram', url: 'https://www.instagram.com/saintaubinsurloire', label: null, icon: null },
    ],
    navigation_config: {
      main: [
        { type: 'group', label: 'Mairie', children: [{ type: 'section', section: 'equipe' }, { type: 'section', section: 'documents' }, { type: 'page', pageDocumentId: 'page-etat-civil' }] },
        {
          type: 'group',
          label: 'Vie pratique',
          children: [
            { type: 'section', section: 'associations' },
            { type: 'section', section: 'cantine' },
            { type: 'section', section: 'dechets' },
            { type: 'page', pageDocumentId: 'page-salle-des-fetes' },
          ],
        },
        { type: 'section', section: 'demarches' },
        { type: 'section', section: 'actualites' },
        { type: 'section', section: 'agenda' },
        { type: 'section', section: 'contact' },
      ],
      footer: [
        { type: 'section', section: 'perturbations' },
        { type: 'section', section: 'open-data' },
        { type: 'external', url: 'https://www.cc-loire-aubance.fr', label: 'Communauté de communes' },
      ],
    },
    homepage: {
      id: 1,
      meta_description: 'Site officiel de la commune de Saint-Aubin-sur-Loire : démarches, actualités, agenda et vie pratique.',
      hero: {
        id: 1,
        enabled: true,
        title: 'Bienvenue à Saint-Aubin-sur-Loire',
        subtitle: 'Une commune de 3 240 habitants au bord de la Loire. Retrouvez ici vos démarches, l’actualité et la vie de la commune.',
        image: media('quais-de-loire.svg', { alt: '', caption: 'Les quais de Loire au printemps', width: 1600, height: 900 }),
        primary_label: 'Faire une démarche',
        primary_url: '/demarches',
        secondary_label: 'Contacter la mairie',
        secondary_url: '/contact',
      },
      quick_links: {
        id: 1,
        enabled: true,
        items: [
          { id: 1, label: 'État civil', description: 'Actes de naissance, mariage, décès', url: '/etat-civil', icon: 'identity' },
          { id: 2, label: 'Urbanisme', description: 'Permis, déclarations de travaux, PLU', url: '/urbanisme', icon: 'building' },
          { id: 3, label: 'Inscriptions scolaires', description: 'École, cantine, garderie', url: '/inscriptions-scolaires', icon: 'book' },
          { id: 4, label: 'Salle des fêtes', description: 'Location et tarifs', url: '/salle-des-fetes', icon: 'calendar' },
          { id: 5, label: 'Signaler un problème', description: 'Voirie, éclairage, propreté', url: '/contact', icon: 'alert' },
          { id: 6, label: 'Documents officiels', description: 'Conseils, arrêtés, budget', url: '/documents', icon: 'document' },
          { id: 7, label: 'Collecte des déchets', description: 'Jours de passage par quartier', url: '/collecte-des-dechets', icon: 'clock' },
          { id: 8, label: 'Associations', description: 'Annuaire et vie associative', url: '/associations', icon: 'users' },
        ],
      },
      featured_news: { id: 1, enabled: true, count: 3 },
      agenda: { id: 2, enabled: true, count: 3 },
      mayor_word: {
        id: 1,
        enabled: true,
        title: 'Le mot du maire',
        body: rich(
          p('Chères Saint-Aubinoises, chers Saint-Aubinois,'),
          p('cette rentrée est marquée par la réouverture de notre médiathèque, un lieu que nous avons voulu plus ouvert et plus accessible. Je vous invite à venir la découvrir dès le 4 octobre.'),
        ),
        photo: media('portrait-maire.svg', { alt: 'Claire Martin, maire de Saint-Aubin-sur-Loire', width: 600, height: 750 }),
        signature_name: 'Claire Martin',
        signature_role: 'Maire de Saint-Aubin-sur-Loire',
      },
      key_figures: {
        id: 1,
        enabled: true,
        items: [
          { id: 1, value: '3 240', label: 'habitants', icon: 'users' },
          { id: 2, value: '42', label: 'associations', icon: 'heart' },
          { id: 3, value: '2', label: 'écoles', icon: 'book' },
          { id: 4, value: '18 km²', label: 'de superficie', icon: 'map' },
        ],
      },
      practical_info: { id: 1, enabled: true },
      weather: { id: 2, enabled: true },
      waste_collection: { id: 3, enabled: true },
      disruptions: { id: 4, enabled: true },
      canteen: { id: 5, enabled: true },
      associations: { id: 3, enabled: true, count: 4 },
      partners: {
        id: 1,
        enabled: true,
        items: [
          { id: 1, name: 'Communauté de communes Loire-Aubance', logo: media('partenaire.svg', { alt: 'Communauté de communes Loire-Aubance', width: 400, height: 200 }), url: 'https://www.cc-loire-aubance.fr' },
          { id: 2, name: 'Département de Maine-et-Loire', logo: media('partenaire.svg', { alt: 'Département de Maine-et-Loire', width: 400, height: 200 }), url: 'https://www.maine-et-loire.fr' },
        ],
      },
      newsletter: { id: 6, enabled: true },
      free_content: {
        id: 1,
        enabled: true,
        title: 'La commune',
        body: rich(p('Blottie entre Loire et coteaux, Saint-Aubin-sur-Loire conjugue patrimoine ligérien, vie associative dense et services de proximité.')),
      },
    },
  }) as unknown as Site;

// --- Pages ---------------------------------------------------------------------------------------

export const pages = (): Page[] =>
  [
    doc('page-salle-des-fetes', {
      title: 'Location de la salle des fêtes',
      slug: 'salle-des-fetes',
      lead: 'L’Espace Loire accueille vos fêtes de famille, réunions et événements associatifs jusqu’à 250 personnes.',
      featured_image: media('salle-des-fetes.svg', { alt: 'La grande salle de l’Espace Loire', width: 1200, height: 800 }),
      meta_description: 'Tarifs, capacité et réservation de la salle des fêtes de Saint-Aubin-sur-Loire.',
      show_in_menu: true,
      menu_order: 1,
      scheduled_at: null,
      seo_keywords: null,
      updatedAt: '2026-09-10T08:00:00.000Z',
      blocks: [
        {
          id: 1,
          __component: 'blocks.text',
          body: rich(
            h2('Ce que comprend la location'),
            p('La salle de 300 m² est louée avec ', b('tables, chaises et cuisine équipée'), '. Le ménage de fin de location est à la charge du locataire.'),
            ul('250 places assises', 'Cuisine avec four, réfrigérateurs et lave-vaisselle', 'Parking de 60 places', 'Accès de plain-pied'),
            h2('Tarifs'),
            h3('Habitants de la commune'),
            p('Week-end : 350 € — journée en semaine : 150 €.'),
            h3('Extérieurs à la commune'),
            p('Week-end : 600 € — journée en semaine : 250 €.'),
          ),
        },
        { id: 2, __component: 'blocks.image', image: media('scene.svg', { alt: 'La scène de la salle, avec éclairage', width: 1200, height: 800 }), caption: 'La scène et son éclairage', width: 'full' },
        {
          id: 3,
          __component: 'blocks.callout',
          variant: 'warning',
          title: 'Caution',
          body: rich(p('Une caution de 500 € est demandée à la remise des clés. Elle est rendue après l’état des lieux de sortie.')),
        },
        {
          id: 4,
          __component: 'blocks.text',
          body: rich(h2('Étapes de réservation'), ol('Vérifiez la disponibilité auprès de la mairie.', 'Remplissez le formulaire de réservation.', 'Versez l’acompte de 30 %.', 'Récupérez les clés la veille de l’événement.')),
        },
        {
          id: 5,
          __component: 'blocks.buttons',
          buttons: [
            { id: 1, label: 'Réserver la salle', url: '/contact', style: 'primary' },
            { id: 2, label: 'Voir le calendrier des disponibilités', url: 'https://agenda.saint-aubin-sur-loire.fr', style: 'secondary' },
          ],
        },
        {
          id: 6,
          __component: 'blocks.documents',
          title: 'À télécharger',
          files: [
            media('reglement.pdf', { caption: 'Règlement intérieur de la salle des fêtes', size: 240 }),
            media('reglement.pdf', { caption: 'Formulaire de réservation', size: 180 }),
          ],
        },
        {
          id: 7,
          __component: 'blocks.gallery',
          title: 'La salle en images',
          images: [
            media('salle-des-fetes.svg', { alt: 'La grande salle vide', width: 1200, height: 800 }),
            media('cuisine.svg', { alt: 'La cuisine équipée', width: 1200, height: 800 }),
            media('scene.svg', { alt: 'La scène', width: 1200, height: 800 }),
            media('parking.svg', { alt: 'Le parking de 60 places', width: 1200, height: 800 }),
          ],
        },
        {
          id: 8,
          __component: 'blocks.faq',
          title: 'Questions fréquentes',
          items: [
            { id: 1, question: 'Peut-on louer la salle pour un anniversaire ?', answer: rich(p('Oui, la salle est louée aux particuliers pour toutes les fêtes de famille.')) },
            { id: 2, question: 'Quel est le montant de la caution ?', answer: rich(p('La caution est de 500 €, rendue après l’état des lieux.')) },
            { id: 3, question: 'La salle est-elle accessible aux personnes à mobilité réduite ?', answer: rich(p('Oui : accès de plain-pied, sanitaires adaptés et places de parking réservées.')) },
          ],
        },
        {
          id: 9,
          __component: 'blocks.contact',
          name: 'Espace Loire – salle des fêtes',
          address: '12 rue du Stade, 49000 Saint-Aubin-sur-Loire',
          phone: '02 41 00 00 02',
          email: 'salle@saint-aubin-sur-loire.fr',
          hours: 'Visites sur rendez-vous, du lundi au vendredi',
          show_map: true,
        },
        {
          id: 10,
          __component: 'blocks.video',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          title: 'Visite virtuelle de la salle des fêtes',
          transcript: 'Visite commentée de la grande salle, de la cuisine et du parking de l’Espace Loire.',
        },
      ],
    }),
    doc('page-etat-civil', {
      title: 'État civil',
      slug: 'etat-civil',
      lead: 'Naissance, mariage, PACS, décès : les démarches d’état civil à la mairie.',
      featured_image: null,
      meta_description: null,
      show_in_menu: true,
      menu_order: 2,
      scheduled_at: null,
      seo_keywords: null,
      blocks: [
        { id: 1, __component: 'blocks.text', body: rich(h2('Demander un acte'), p('Les actes d’état civil peuvent être demandés en ligne, par courrier ou au guichet de la mairie.')) },
        { id: 2, __component: 'blocks.callout', variant: 'info', title: null, body: rich(p('La délivrance des actes est gratuite.')) },
      ],
    }),
    doc('page-urbanisme', {
      title: 'Urbanisme',
      slug: 'urbanisme',
      lead: null,
      featured_image: null,
      meta_description: null,
      show_in_menu: false,
      menu_order: 3,
      scheduled_at: null,
      seo_keywords: null,
      blocks: [{ id: 1, __component: 'blocks.text', body: rich(p('Permis de construire, déclarations préalables et consultation du plan local d’urbanisme.')) }],
    }),
    doc('page-inscriptions-scolaires', {
      title: 'Inscriptions scolaires',
      slug: 'inscriptions-scolaires',
      lead: null,
      featured_image: null,
      meta_description: null,
      show_in_menu: false,
      menu_order: 4,
      scheduled_at: null,
      seo_keywords: null,
      blocks: [],
    }),
  ] as unknown as Page[];

// --- Actualités ----------------------------------------------------------------------------------

const article = (id: string, title: string, slug: string, date: string, extra: Record<string, unknown> = {}) =>
  doc(id, {
    title,
    slug,
    publication_date: date,
    summary: null,
    category: 'news',
    author: null,
    featured: false,
    meta_description: null,
    scheduled_at: null,
    view_count: 0,
    image: null,
    blocks: [{ id: 1, __component: 'blocks.text', body: rich(p('Contenu de l’article.')) }],
    ...extra,
  });

export const articles = (): Article[] =>
  [
    article(
      'article-mediatheque',
      'Réouverture de la médiathèque après travaux : nouveaux horaires et inscriptions pour la rentrée',
      'reouverture-de-la-mediatheque',
      '2026-09-18T08:00:00.000Z',
      {
        featured: true,
        summary: 'Après huit mois de travaux, la médiathèque rouvre ses portes le 4 octobre avec des horaires élargis et un espace numérique.',
        image: media('mediatheque.svg', { alt: 'La nouvelle salle de lecture de la médiathèque', width: 1200, height: 800 }),
        author: 'Service communication',
        blocks: [
          { id: 1, __component: 'blocks.text', body: rich(p('La médiathèque rouvre le ', b('samedi 4 octobre'), '.'), h2('Nouveaux horaires'), ul('Mardi et vendredi : 15h–19h', 'Mercredi et samedi : 10h–18h')) },
          { id: 2, __component: 'blocks.buttons', buttons: [{ id: 1, label: 'S’inscrire en ligne', url: 'https://mediatheque.saint-aubin-sur-loire.fr', style: 'primary' }] },
        ],
      },
    ),
    article('article-coupure', 'Coupure d’eau mardi 8 octobre quartier de la Gare', 'coupure-d-eau-quartier-de-la-gare', '2026-09-20T08:00:00.000Z', {
      category: 'emergency',
      summary: 'Travaux sur le réseau : l’eau sera coupée de 9h à 12h. Pensez à faire des réserves.',
    }),
    article('article-conseil', 'Compte rendu du conseil municipal du 15 septembre', 'conseil-municipal-15-septembre', '2026-09-16T08:00:00.000Z', {
      category: 'information',
      summary: 'Budget des écoles, subventions aux associations et travaux de voirie au programme.',
      image: media('marche.svg', { alt: '', width: 1200, height: 800 }),
    }),
    article('article-marche', 'Le marché du samedi s’agrandit', 'le-marche-du-samedi-s-agrandit', '2026-09-10T08:00:00.000Z', {
      summary: 'Six nouveaux producteurs rejoignent la place de l’Église.',
      image: media('marche.svg', { alt: 'Étals du marché sur la place de l’Église', width: 1200, height: 800 }),
    }),
    article('article-voirie', 'Travaux de voirie rue des Écoles', 'travaux-rue-des-ecoles', '2026-09-05T08:00:00.000Z', {
      category: 'information',
      image: media('travaux.svg', { alt: 'Engins de chantier rue des Écoles', width: 1200, height: 800 }),
    }),
    article('article-fete', 'Retour en images sur la fête de la Loire', 'fete-de-la-loire-en-images', '2026-07-16T08:00:00.000Z', { category: 'event' }),
  ] as unknown as Article[];

// --- Agenda --------------------------------------------------------------------------------------

const event = (id: string, title: string, slug: string, start: string, end: string | null, extra: Record<string, unknown> = {}) =>
  doc(id, {
    title,
    slug,
    start_date: start,
    end_date: end,
    location: null,
    address: null,
    image: null,
    price: null,
    external_link: null,
    category: 'cultural',
    organizer: null,
    contact_email: null,
    contact_phone: null,
    max_participants: null,
    registration_required: false,
    registration_deadline: null,
    featured: false,
    scheduled_at: null,
    blocks: [],
    ...extra,
  });

export const events = (): Evenement[] =>
  [
    event('event-concert', 'Concert de rentrée de l’harmonie municipale', 'concert-de-rentree', '2026-10-03T12:00:00.000Z', '2026-10-03T16:00:00.000Z', {
      location: 'Salle des fêtes – Espace Loire',
      address: '12 rue du Stade, 49000 Saint-Aubin-sur-Loire',
      image: media('harmonie.svg', { alt: 'L’harmonie municipale en concert', width: 1200, height: 800 }),
      price: 'Free',
      organizer: 'Harmonie municipale',
      contact_email: 'harmonie@saint-aubin-sur-loire.fr',
      contact_phone: '02 41 00 00 02',
      external_link: 'https://harmonie-saint-aubin.fr',
      max_participants: 250,
      registration_required: true,
      registration_deadline: '2026-10-01T22:00:00.000Z',
      featured: true,
      blocks: [
        {
          id: 1,
          __component: 'blocks.text',
          body: rich(h2('Programme'), p('L’harmonie ouvre sa saison avec des musiques de films et des créations des élèves de l’école de musique.'), ul('14h : ouverture des portes', '14h30 : orchestre junior', '16h : harmonie municipale')),
        },
        { id: 2, __component: 'blocks.callout', variant: 'info', title: 'Information', body: rich(p('Salle accessible aux personnes à mobilité réduite. Boucle magnétique disponible sur demande.')) },
      ],
    }),
    event('event-mediatheque', 'Inauguration de la médiathèque', 'inauguration-de-la-mediatheque', '2026-10-04T08:30:00.000Z', '2026-10-04T10:00:00.000Z', {
      location: 'Médiathèque',
      category: 'celebration',
    }),
    event('event-conseil', 'Conseil municipal', 'conseil-municipal-octobre', '2026-10-13T18:30:00.000Z', null, { location: 'Salle du conseil, mairie', category: 'meeting' }),
    event('event-brocante', 'Brocante et vide-greniers d’automne', 'brocante-d-automne', '2026-10-17T06:00:00.000Z', '2026-10-18T16:00:00.000Z', {
      location: 'Place de l’Église et rues adjacentes',
      category: 'celebration',
      price: '3 € le mètre linéaire',
      organizer: 'Comité des fêtes',
    }),
    event('event-atelier', 'Atelier numérique : réaliser ses démarches en ligne', 'atelier-demarches-en-ligne', '2026-10-21T08:00:00.000Z', '2026-10-21T10:00:00.000Z', {
      location: 'Espace numérique de la médiathèque',
      category: 'workshop',
      max_participants: 10,
      registration_required: true,
    }),
    event('event-passe', 'Fête de la Loire', 'fete-de-la-loire', '2026-07-12T08:00:00.000Z', '2026-07-14T20:00:00.000Z', { category: 'celebration', location: 'Quais de Loire' }),
  ] as unknown as Evenement[];

// --- Documents officiels -------------------------------------------------------------------------

const official = (id: string, title: string, type: string, date: string, reference: string, extra: Record<string, unknown> = {}) =>
  doc(id, {
    title,
    slug: id.replace(/^doc-/, ''),
    description: null,
    document_type: type,
    document_date: date,
    session_date: null,
    reference_number: reference,
    year: Number(date.slice(0, 4)),
    file: media('reglement.pdf', { size: 310 }),
    additional_files: [],
    scheduled_at: null,
    ...extra,
  });

export const documents = (): OfficialDocument[] =>
  [
    official('doc-pv-2026-06', 'Procès-verbal du conseil municipal du 24 juin 2026', 'pv-conseil-municipal', '2026-06-24', 'PV-2026-04', {
      session_date: '2026-06-24',
      file: media('reglement.pdf', { size: 1234 }),
    }),
    official('doc-del-subventions', 'Attribution des subventions aux associations pour l’année 2026', 'deliberation', '2026-06-24', 'DEL-2026-031', { session_date: '2026-06-24', file: media('reglement.pdf', { size: 240 }) }),
    official('doc-arr-circulation', 'Arrêté de circulation rue des Écoles – travaux du 6 au 17 octobre 2026', 'arrete', '2026-06-17', 'ARR-2026-058', { file: media('reglement.pdf', { size: 180 }) }),
    official('doc-bp-2026', 'Budget primitif 2026 – budget principal', 'budget-primitif', '2026-04-02', 'BP-2026', {
      session_date: '2026-04-02',
      file: media('reglement.pdf', { size: 3800 }),
      additional_files: [media('reglement.pdf', { caption: 'Annexe : état de la dette', size: 420 })],
    }),
    official('doc-ca-2025', 'Compte administratif 2025', 'compte-administratif', '2026-04-02', 'CA-2025', { session_date: '2026-04-02', file: media('reglement.pdf', { size: 2100 }) }),
    official('doc-rob-2026', 'Rapport d’orientations budgétaires 2026', 'rapport-orientations-budgetaires', '2026-03-12', 'ROB-2026', { file: media('reglement.pdf', { size: 950 }) }),
    official('doc-pv-2026-02', 'Procès-verbal du conseil municipal du 10 février 2026', 'pv-conseil-municipal', '2026-02-10', 'PV-2026-01', { session_date: '2026-02-10' }),
    official('doc-plu', 'Plan local d’urbanisme – modification n° 2', 'plu', '2025-11-20', 'PLU-M2', { description: 'Modification simplifiée approuvée par le conseil municipal.' }),
    official('doc-pv-2025-12', 'Procès-verbal du conseil municipal du 9 décembre 2025', 'pv-conseil-municipal', '2025-12-09', 'PV-2025-08', { session_date: '2025-12-09' }),
    official('doc-arr-marche', 'Arrêté portant réglementation du marché hebdomadaire', 'arrete', '2025-09-01', 'ARR-2025-112'),
  ] as unknown as OfficialDocument[];

// --- Équipe municipale ---------------------------------------------------------------------------

const member = (id: string, first: string, last: string, role: string, order: number, extra: Record<string, unknown> = {}) =>
  doc(id, { first_name: first, last_name: last, role, display_order: order, title: null, delegation: null, bio: null, photo: null, email: null, office_hours: null, ...extra });

export const team = (): TeamMember[] =>
  [
    member('elu-martin', 'Claire', 'Martin', 'maire', 1, {
      bio: 'Élue en 2020 et réélue en 2026. Enseignante retraitée, elle préside la commission Finances et représente la commune à la communauté de communes.',
      photo: media('portrait-maire.svg', { alt: 'Claire Martin', width: 600, height: 750 }),
      email: 'maire@saint-aubin-sur-loire.fr',
      office_hours: 'Permanence le samedi matin sur rendez-vous',
    }),
    member('elu-lefevre', 'Marc', 'Lefèvre', 'adjoint', 1, {
      title: '1er adjoint',
      delegation: 'Adjoint aux finances et à l’administration générale',
      photo: media('portrait-1.svg', { alt: 'Marc Lefèvre', width: 600, height: 750 }),
    }),
    member('elu-bernard', 'Sophie', 'Bernard', 'adjoint', 2, { title: '2e adjointe', delegation: 'Adjointe aux affaires scolaires et à la jeunesse' }),
    member('elu-haddad', 'Karim', 'Haddad', 'adjoint', 3, {
      title: '3e adjoint',
      delegation: 'Adjoint à l’urbanisme, à la voirie et aux travaux',
      photo: media('portrait-2.svg', { alt: 'Karim Haddad', width: 600, height: 750 }),
    }),
    member('elu-rousseau', 'Anne', 'Rousseau', 'adjoint', 4, { title: '4e adjointe', delegation: 'Adjointe à la culture, aux associations et à la vie locale' }),
    member('elu-guerin', 'Pierre', 'Guérin', 'adjoint', 5, { title: '5e adjoint', delegation: 'Adjoint à l’environnement et au cadre de vie' }),
    member('elu-dubois', 'Lucie', 'Dubois', 'conseiller', 1, {
      title: 'Conseillère municipale',
      delegation: 'Déléguée au numérique',
      bio: 'Développeuse web, elle accompagne la refonte du site internet et la médiation numérique à la médiathèque.',
    }),
    member('elu-moreau', 'Jean', 'Moreau', 'conseiller', 2),
    member('elu-petit', 'Nadia', 'Petit', 'conseiller', 3, { title: 'Conseillère municipale', delegation: 'Déléguée aux aînés' }),
    member('elu-leroy', 'Thomas', 'Leroy', 'conseiller', 4, { title: 'Conseiller municipal (opposition)' }),
    member('elu-garnier', 'Hélène', 'Garnier', 'conseiller', 5, { title: 'Conseillère municipale' }),
    member('elu-fontaine', 'Paul', 'Fontaine', 'conseiller', 6),
    member('agent-renard', 'Isabelle', 'Renard', 'dgs', 1, { title: 'Directrice générale des services', email: 'dgs@saint-aubin-sur-loire.fr' }),
    member('agent-leroy', 'Sophie', 'Leroy', 'agent', 2, { title: 'Secrétaire de mairie', email: 'accueil@saint-aubin-sur-loire.fr' }),
  ] as unknown as TeamMember[];

// --- Associations --------------------------------------------------------------------------------

const association = (id: string, name: string, category: string, extra: Record<string, unknown> = {}) =>
  doc(id, {
    name,
    category,
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
    ...extra,
  });

export const associations = (): Association[] =>
  [
    association('asso-football', 'Football Club Saint-Aubin', 'sport', {
      description: 'Club de football ouvert à tous dès 5 ans : école de foot, équipes jeunes, seniors et vétérans. Entraînements au stade municipal le mercredi et le vendredi.',
      contact_name: 'Julien Morel',
      contact_email: 'contact@fcsaintaubin.fr',
      contact_phone: '06 12 34 56 78',
      website: 'https://fcsaintaubin.fr',
      address: 'Stade municipal, rue du Stade',
      logo: media('association.svg', { alt: 'Logo du Football Club Saint-Aubin', width: 400, height: 400 }),
    }),
    association('asso-harmonie', 'Harmonie municipale', 'culture', {
      description: 'Orchestre d’harmonie et école de musique.',
      logo: media('association.svg', { alt: 'Logo de l’harmonie municipale', width: 400, height: 400 }),
    }),
    association('asso-ape', 'Association des parents d’élèves', 'education', { description: 'Organise la kermesse, le marché de Noël et soutient les projets des écoles.' }),
    association('asso-randonnee', 'Les randonneurs des coteaux', 'sport', { description: 'Randonnées le dimanche matin sur les chemins des coteaux de Loire.' }),
    association('asso-solidarite', 'Épicerie solidaire', 'social', { description: 'Aide alimentaire et accompagnement des familles.' }),
    association('asso-proposee', 'Club de pétanque', 'sport', { status: 'pending', description: 'Proposition en attente de validation : ne doit pas apparaître.' }),
  ] as unknown as Association[];

// --- Vie pratique --------------------------------------------------------------------------------

export const alerts = (): Alerte[] =>
  [
    doc('alerte-eau', {
      title: 'Coupure d’eau',
      message: 'Quartier de la Gare, mardi 8 octobre de 9h à 12h. Pensez à faire des réserves.',
      severity: 'warning',
      active: true,
      display_from: '2026-09-20T00:00:00.000Z',
      display_until: '2026-10-08T12:00:00.000Z',
      link_url: '/actualites/coupure-d-eau-quartier-de-la-gare',
      link_label: 'En savoir plus',
      alert_type: 'coupure-eau',
      location: 'Quartier de la Gare',
      start_date: '2026-10-08T07:00:00.000Z',
      end_date: '2026-10-08T10:00:00.000Z',
      affected_area: 'Rues de la Gare, des Tilleuls et du Moulin',
    }),
    doc('alerte-travaux', {
      title: 'Travaux rue des Écoles',
      message: 'Circulation alternée du 6 au 17 octobre. Accès riverains maintenu.',
      severity: 'info',
      active: true,
      display_from: null,
      display_until: '2026-10-17T18:00:00.000Z',
      link_url: null,
      link_label: null,
      alert_type: 'travaux',
      location: 'Rue des Écoles',
      start_date: '2026-10-06T06:00:00.000Z',
      end_date: '2026-10-17T16:00:00.000Z',
      affected_area: null,
    }),
    doc('alerte-expiree', {
      title: 'Alerte expirée',
      message: 'Ne doit plus apparaître.',
      severity: 'critical',
      active: true,
      display_from: null,
      display_until: '2026-09-01T00:00:00.000Z',
      link_url: null,
      link_label: null,
      alert_type: 'autre',
      location: null,
      start_date: null,
      end_date: null,
      affected_area: null,
    }),
  ] as unknown as Alerte[];

/** Alerte urgente, pour maquetter le troisième niveau de sévérité. */
export const criticalAlert = (): Alerte =>
  doc('alerte-crue', {
    title: 'Vigilance crue',
    message: 'La Loire est en vigilance orange. Évitez les quais et les chemins de halage.',
    severity: 'critical',
    active: true,
    display_from: null,
    display_until: null,
    link_url: 'https://www.vigicrues.gouv.fr',
    link_label: 'Suivre la vigilance',
    alert_type: 'intemperie',
    location: null,
    start_date: null,
    end_date: null,
    affected_area: 'Quais de Loire',
  }) as unknown as Alerte;

export const waste = (): WasteSchedule[] =>
  [
    doc('dechets-om', { waste_type: 'ordures-menageres', collection_day: 'jeudi', frequency: 'hebdomadaire', start_date: null, zone: null, notes: 'Sortir les bacs la veille au soir.', active: true }),
    doc('dechets-tri', { waste_type: 'tri-selectif', collection_day: 'mardi', frequency: 'bimensuel', start_date: '2026-09-15', zone: null, notes: null, active: true }),
    doc('dechets-verre', { waste_type: 'verre', collection_day: 'mercredi', frequency: 'mensuel', start_date: '2026-09-09', zone: 'Bourg', notes: 'Bornes d’apport volontaire également disponibles.', active: true }),
    doc('dechets-verts', { waste_type: 'dechets-verts', collection_day: 'lundi', frequency: 'bimensuel', start_date: '2026-09-14', zone: 'Hameaux', notes: 'D’avril à novembre.', active: true }),
    doc('dechets-encombrants', { waste_type: 'encombrants', collection_day: 'vendredi', frequency: 'mensuel', start_date: '2026-09-04', zone: null, notes: 'Sur inscription auprès de la mairie.', active: true }),
  ] as unknown as WasteSchedule[];

const meal = (id: number, day: string, starter: string, main: string, side: string, dairy: string, dessert: string, labels: Record<string, string[]> = {}) => ({
  id,
  day,
  starter,
  main_course: main,
  side_dish: side,
  dairy,
  dessert,
  snack: null,
  labels,
});

export const canteen = (): SchoolMenu[] =>
  [
    doc('cantine-s39', {
      week_start: '2026-09-21',
      menu_mode: 'manual',
      school_name: 'École Jules-Ferry',
      menu_image: null,
      menu_pdf: null,
      meals: [
        meal(1, 'lundi', 'Carottes râpées', 'Poulet basquaise', 'Riz', 'Yaourt nature', 'Pomme', { main: ['local'], dessert: ['bio'] }),
        meal(2, 'mardi', 'Salade de lentilles', 'Poisson pané', 'Haricots verts', 'Emmental', 'Compote', { starter: ['bio'] }),
        meal(4, 'jeudi', 'Betteraves', 'Lasagnes aux légumes', 'Salade verte', 'Fromage blanc', 'Poire', { main: ['vegetarien', 'fait-maison'] }),
        meal(5, 'vendredi', 'Potage de saison', 'Filet de colin', 'Purée', 'Camembert', 'Gâteau au chocolat', { dessert: ['fait-maison'] }),
      ],
    }),
    doc('cantine-s40', {
      week_start: '2026-09-28',
      menu_mode: 'image',
      school_name: 'École Jules-Ferry',
      menu_image: media('menu-cantine.svg', { alt: 'Menu de la semaine du 28 septembre au 2 octobre', width: 1200, height: 1600 }),
      menu_pdf: media('reglement.pdf', { caption: 'Menu du 28 septembre au 2 octobre', size: 150 }),
      meals: [],
    }),
  ] as unknown as SchoolMenu[];
