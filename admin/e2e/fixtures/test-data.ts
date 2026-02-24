/**
 * Données de test réalistes pour la commune fictive de Saint-Martin-les-Bains.
 * Commune provençale de 8 500 habitants.
 */

// ── Site Configuration ─────────────────────────────────────────────────────

export const siteConfig = {
  name: 'Saint-Martin-les-Bains',
  slug: 'saint-martin-les-bains',
  contact_mail: 'mairie@saint-martin-les-bains.fr',
  contact_phone: '04 90 12 34 56',
  address: '1 Place de la République\n13200 Saint-Martin-les-Bains',
  colors: '{"primary": "#1e3a5f", "secondary": "#8b4513"}',
  siret: '21130000000012',
  publication_director: 'Jean-Pierre Duval',
  publication_director_title: 'Maire',
  hebergeur_name: 'Netlify, Inc.',
  hebergeur_address: '44 Montgomery St, Suite 300, San Francisco, CA 94104, USA',
  hebergeur_phone: '+1 844 899 7312',
  population: 8500,
}

// ── Pages ──────────────────────────────────────────────────────────────────

export const pages = [
  {
    title: 'Accueil',
    slug: 'accueil',
    content: '<h2>Bienvenue à Saint-Martin-les-Bains</h2><p>Nichée au cœur de la Provence, notre commune de 8 500 habitants vous accueille dans un cadre exceptionnel entre collines et oliviers.</p>',
    status: 'published' as const,
    template: 'default' as const,
    menu_order: 0,
  },
  {
    title: 'Votre Mairie',
    slug: 'votre-mairie',
    content: '<h2>Votre Mairie</h2><p>La mairie de Saint-Martin-les-Bains est ouverte du lundi au vendredi, de 8h30 à 12h et de 14h à 17h.</p><p>L\'équipe municipale est à votre disposition pour répondre à vos questions et vous accompagner dans vos démarches administratives.</p>',
    status: 'published' as const,
    template: 'about' as const,
    menu_order: 1,
  },
  {
    title: 'Services municipaux',
    slug: 'services-municipaux',
    content: '<h2>Services municipaux</h2><p>La commune met à disposition de ses habitants de nombreux services pour faciliter leur quotidien.</p><ul><li>État civil et démarches administratives</li><li>Urbanisme et permis de construire</li><li>Action sociale et solidarité</li><li>Vie scolaire et périscolaire</li></ul>',
    status: 'published' as const,
    template: 'services' as const,
    menu_order: 2,
  },
  {
    title: 'Urbanisme',
    slug: 'urbanisme',
    content: '<h2>Urbanisme</h2><p>Le service urbanisme vous accompagne dans vos projets de construction, rénovation et aménagement.</p><h3>Démarches en ligne</h3><p>Vous pouvez désormais déposer vos demandes de permis de construire et déclarations préalables en ligne.</p>',
    status: 'published' as const,
    template: 'default' as const,
    menu_order: 0,
    parentTitle: 'Services municipaux',
  },
  {
    title: 'Vie associative',
    slug: 'vie-associative',
    content: '<h2>Vie associative</h2><p>Saint-Martin-les-Bains compte plus de 60 associations actives dans les domaines du sport, de la culture, du social et de l\'environnement.</p>',
    status: 'published' as const,
    template: 'default' as const,
    menu_order: 3,
  },
  {
    title: 'Contact',
    slug: 'contact',
    content: '<h2>Contactez-nous</h2><p>Vous pouvez nous joindre par téléphone, par email ou en vous rendant directement à la mairie.</p>',
    status: 'published' as const,
    template: 'default' as const,
    menu_order: 4,
  },
]

// ── Articles ───────────────────────────────────────────────────────────────

export const articles = [
  {
    title: 'Inauguration de la nouvelle médiathèque',
    slug: 'inauguration-mediatheque',
    content: '<h2>Un nouvel espace culturel pour tous</h2><p>La médiathèque municipale \"Les Oliviers\" ouvrira ses portes le 15 mars prochain. Ce nouvel équipement de 800 m² proposera un large catalogue de livres, DVD, CD et ressources numériques.</p><p>L\'espace jeunesse, avec ses 200 m² dédiés, accueillera les enfants dès 3 ans pour des ateliers lecture et des animations.</p>',
    summary: 'La nouvelle médiathèque municipale ouvrira ses portes le 15 mars. Un espace de 800 m² pour tous les habitants.',
    status: 'published' as const,
    category: 'news' as const,
    author: 'Service Communication',
    featured: true,
    meta_description: 'Inauguration de la médiathèque municipale Les Oliviers à Saint-Martin-les-Bains le 15 mars.',
  },
  {
    title: 'Travaux rue de la Place du Marché',
    slug: 'travaux-place-du-marche',
    content: '<h2>Réfection de la chaussée</h2><p>Des travaux de réfection de la chaussée et des trottoirs débuteront le 1er avril sur la Place du Marché et les rues adjacentes.</p><h3>Impact sur la circulation</h3><p>La circulation sera déviée par la rue des Lilas pendant toute la durée des travaux, estimée à 6 semaines.</p><p>Le stationnement sera interdit sur la place du 1er avril au 15 mai.</p>',
    summary: 'Des travaux de voirie débutent le 1er avril. Circulation déviée pendant 6 semaines.',
    status: 'published' as const,
    category: 'information' as const,
    author: 'Service Voirie',
    featured: false,
    meta_description: 'Travaux de réfection Place du Marché à Saint-Martin-les-Bains du 1er avril au 15 mai.',
  },
  {
    title: 'Alerte canicule : les bons réflexes',
    slug: 'alerte-canicule-bons-reflexes',
    content: '<h2>Vigilance orange canicule</h2><p>Météo-France a placé notre département en vigilance orange canicule. Voici les bons réflexes à adopter :</p><ul><li>Buvez régulièrement de l\'eau</li><li>Évitez les sorties aux heures les plus chaudes</li><li>Maintenez votre logement frais</li><li>Donnez des nouvelles à vos proches</li></ul><p>Le registre communal des personnes vulnérables est ouvert. Contactez le CCAS au 04 90 12 34 57.</p>',
    summary: 'Vigilance orange canicule. Adoptez les bons réflexes et inscrivez-vous au registre communal.',
    status: 'published' as const,
    category: 'emergency' as const,
    author: 'CCAS',
    featured: true,
    meta_description: 'Alerte canicule à Saint-Martin-les-Bains. Conseils et numéros utiles.',
  },
  {
    title: 'Compte-rendu du Conseil Municipal du 12 février',
    slug: 'compte-rendu-conseil-municipal-fevrier',
    content: '<h2>Conseil Municipal du 12 février 2026</h2><p>Le conseil municipal s\'est réuni le 12 février 2026 en séance ordinaire. Les principaux points abordés :</p><ul><li>Approbation du budget primitif 2026</li><li>Projet de rénovation de l\'école Jean Jaurès</li><li>Convention avec l\'intercommunalité pour la gestion des déchets</li></ul>',
    summary: 'Résumé des délibérations du conseil municipal du 12 février 2026.',
    status: 'draft' as const,
    category: 'news' as const,
    author: 'Secrétariat Général',
    featured: false,
    meta_description: 'Compte-rendu du conseil municipal de Saint-Martin-les-Bains du 12 février 2026.',
  },
]

// ── Événements ─────────────────────────────────────────────────────────────

export const events = [
  {
    title: 'Conseil Municipal',
    slug: 'conseil-municipal-mars',
    description: '<p>Séance ordinaire du conseil municipal. Ordre du jour : subventions aux associations, plan de circulation centre-ville, convention intercommunale eau et assainissement.</p>',
    start_date: '2026-03-20T18:30',
    end_date: '2026-03-20T21:00',
    location: 'Salle du Conseil - Mairie',
    address: '1 Place de la République, 13200 Saint-Martin-les-Bains',
    category: 'meeting' as const,
    organizer: 'Mairie de Saint-Martin-les-Bains',
    contact_email: 'mairie@saint-martin-les-bains.fr',
    registration_required: false,
    featured: false,
  },
  {
    title: 'Fête de la Musique',
    slug: 'fete-de-la-musique-2026',
    description: '<p>Comme chaque année, Saint-Martin-les-Bains fête la musique ! Scènes ouvertes sur la Place du Marché, dans le parc municipal et au kiosque à musique. Jazz, rock, musique classique et fanfare municipale.</p>',
    start_date: '2026-06-21T18:00',
    end_date: '2026-06-22T00:00',
    location: 'Place du Marché et Parc Municipal',
    address: 'Place du Marché, 13200 Saint-Martin-les-Bains',
    category: 'cultural' as const,
    organizer: 'Service Culturel',
    contact_email: 'culture@saint-martin-les-bains.fr',
    registration_required: false,
    featured: true,
    price: 'Gratuit',
  },
  {
    title: 'Marché de Noël',
    slug: 'marche-de-noel-2026',
    description: '<p>Le traditionnel marché de Noël de Saint-Martin-les-Bains revient avec plus de 40 exposants : artisanat local, produits du terroir, crèche vivante et animations pour enfants.</p>',
    start_date: '2026-12-13T10:00',
    end_date: '2026-12-14T19:00',
    location: 'Place de la République',
    address: '1 Place de la République, 13200 Saint-Martin-les-Bains',
    category: 'celebration' as const,
    organizer: 'Office de Tourisme',
    contact_email: 'tourisme@saint-martin-les-bains.fr',
    registration_required: false,
    featured: true,
    price: 'Entrée libre',
  },
  {
    title: 'Tournoi de pétanque inter-quartiers',
    slug: 'tournoi-petanque-2026',
    description: '<p>Grand tournoi de pétanque organisé par la Boule Martinoise. Doublettes formées par tirage au sort. Inscription sur place dès 8h30. Remise des prix et apéritif offert par la municipalité.</p>',
    start_date: '2026-07-14T09:00',
    end_date: '2026-07-14T18:00',
    location: 'Boulodrome Municipal',
    address: 'Avenue des Sports, 13200 Saint-Martin-les-Bains',
    category: 'sport' as const,
    organizer: 'La Boule Martinoise',
    contact_email: 'petanque@saint-martin.fr',
    contact_phone: '06 12 34 56 78',
    registration_required: true,
    max_participants: 64,
    registration_deadline: '2026-07-12T18:00',
    featured: false,
    price: '5€ par doublette',
  },
]

// ── Équipe municipale ──────────────────────────────────────────────────────

export const teamMembers = [
  {
    first_name: 'Jean-Pierre',
    last_name: 'Duval',
    role: 'maire' as const,
    delegation: 'Administration générale, finances et urbanisme',
    bio: 'Maire de Saint-Martin-les-Bains depuis 2020. Ancien directeur d\'école, Jean-Pierre Duval s\'engage pour une commune solidaire et tournée vers l\'avenir.',
    display_order: 1,
  },
  {
    first_name: 'Marie',
    last_name: 'Lefèvre',
    role: 'adjoint' as const,
    delegation: 'Culture, vie associative et communication',
    bio: 'Première adjointe en charge de la culture et de la vie associative. Passionnée de patrimoine provençal.',
    display_order: 2,
  },
  {
    first_name: 'Ahmed',
    last_name: 'Benali',
    role: 'adjoint' as const,
    delegation: 'Travaux, voirie et développement durable',
    bio: 'Deuxième adjoint, Ahmed Benali supervise les projets d\'aménagement et la transition écologique de la commune.',
    display_order: 3,
  },
  {
    first_name: 'Sophie',
    last_name: 'Martin',
    role: 'conseiller' as const,
    delegation: 'Action sociale et solidarité',
    bio: 'Conseillère municipale déléguée à l\'action sociale, Sophie Martin coordonne les actions du CCAS.',
    display_order: 4,
  },
  {
    first_name: 'Philippe',
    last_name: 'Roux',
    role: 'dgs' as const,
    delegation: 'Direction générale des services',
    bio: 'Directeur général des services depuis 2018. Diplômé de l\'INET, Philippe Roux assure le pilotage administratif de la commune.',
    display_order: 5,
  },
]

// ── Associations ───────────────────────────────────────────────────────────

export const associations = [
  {
    name: 'AS Saint-Martin Football',
    category: 'sport' as const,
    description: 'Club de football fondé en 1952. Équipes seniors, juniors et école de foot. Le club compte plus de 200 licenciés et évolue en Régionale 2.',
    contact_name: 'Patrick Moulin',
    contact_email: 'contact@as-saintmartin-foot.fr',
    contact_phone: '06 23 45 67 89',
    website: 'https://as-saintmartin-foot.fr',
    address: 'Stade Municipal René Blanc, Avenue des Sports',
  },
  {
    name: 'Les Amis de la Bibliothèque',
    category: 'culture' as const,
    description: 'Association des amis de la bibliothèque municipale. Organisation de rencontres littéraires, clubs de lecture et ateliers d\'écriture.',
    contact_name: 'Françoise Blanc',
    contact_email: 'amis-biblio@saint-martin.fr',
    contact_phone: '04 90 12 34 58',
    address: 'Médiathèque Les Oliviers, Rue de la Culture',
  },
  {
    name: 'Solidarité Saint-Martin',
    category: 'social' as const,
    description: 'Association d\'aide aux personnes en difficulté. Distribution alimentaire, vestiaire solidaire et accompagnement social.',
    contact_name: 'Isabelle Dupont',
    contact_email: 'solidarite@saint-martin.fr',
    contact_phone: '04 90 12 34 59',
    address: 'Maison des Associations, 12 Rue Victor Hugo',
  },
  {
    name: 'Les Jardins Partagés de Saint-Martin',
    category: 'environnement' as const,
    description: 'Jardins partagés et familiaux gérés collectivement. Ateliers de jardinage écologique et compostage. 45 parcelles disponibles.',
    contact_name: 'Laurent Petit',
    contact_email: 'jardins@saint-martin.fr',
    website: 'https://jardins-saintmartin.fr',
    address: 'Chemin des Jardins, derrière le gymnase',
  },
]

// ── Documents officiels ────────────────────────────────────────────────────

export const officialDocuments = [
  {
    title: 'Procès-verbal du Conseil Municipal du 12 février 2026',
    slug: 'pv-conseil-municipal-fevrier-2026',
    description: 'Procès-verbal de la séance ordinaire du conseil municipal du 12 février 2026.',
    reference_number: 'PV-2026-02',
    document_type: 'pv-conseil-municipal' as const,
    year: 2026,
    document_date: '2026-02-12',
    session_date: '2026-02-12',
    status: 'published' as const,
  },
  {
    title: 'Délibération n°2026-015 - Budget primitif 2026',
    slug: 'deliberation-budget-primitif-2026',
    description: 'Délibération portant approbation du budget primitif de la commune pour l\'exercice 2026.',
    reference_number: 'DEL-2026-015',
    document_type: 'deliberation' as const,
    year: 2026,
    document_date: '2026-02-12',
    session_date: '2026-02-12',
    status: 'published' as const,
  },
  {
    title: 'Budget primitif 2026',
    slug: 'budget-primitif-2026',
    description: 'Document budgétaire : budget primitif de la commune de Saint-Martin-les-Bains pour l\'exercice 2026.',
    reference_number: 'BP-2026',
    document_type: 'budget-primitif' as const,
    year: 2026,
    document_date: '2026-01-15',
    status: 'draft' as const,
  },
]

// ── Alertes ────────────────────────────────────────────────────────────────

export const alertes = [
  {
    title: 'Coupure d\'eau programmée - Quartier des Oliviers',
    message: 'Une coupure d\'eau est programmée le jeudi 6 mars de 9h à 14h dans le quartier des Oliviers pour des travaux de maintenance sur le réseau. Pensez à faire des réserves d\'eau.',
    severity: 'warning' as const,
    active: true,
    display_from: '2026-03-04T08:00',
    display_until: '2026-03-06T15:00',
    link_url: 'https://saint-martin-les-bains.fr/services-municipaux',
    link_label: 'Voir les services',
  },
  {
    title: 'Inscriptions périscolaires 2026-2027',
    message: 'Les inscriptions aux activités périscolaires pour l\'année 2026-2027 sont ouvertes du 1er au 30 avril. Rendez-vous sur le portail famille ou à l\'accueil de la mairie.',
    severity: 'info' as const,
    active: true,
    display_from: '2026-04-01T00:00',
    display_until: '2026-04-30T23:59',
    link_url: '',
    link_label: '',
  },
]

// ── Utilisateur test ───────────────────────────────────────────────────────

export const testUser = {
  email: 'test@example.com',
  password: 'test123',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
}

export const newUser = {
  username: 'marie.lefevre',
  email: 'marie.lefevre@saint-martin-les-bains.fr',
  first_name: 'Marie',
  last_name: 'Lefèvre',
  phone: '06 98 76 54 32',
  municipality_role: 'editor' as const,
}
