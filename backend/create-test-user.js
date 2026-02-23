const axios = require('axios');

// ============================================================================
// Configuration
// ============================================================================

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';

const ADMIN_CREDS = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
  firstname: 'Admin',
  lastname: 'User',
};

const TEST_SITE = {
  name: 'Mairie de Bellefontaine',
  slug: 'bellefontaine',
  theme: 'moderne',
  contact_mail: 'contact@mairie-bellefontaine.fr',
  contact_phone: '05 63 55 40 12',
  address: '1 Place de la Mairie\n81170 Bellefontaine\nFrance',
  plan_type: 'premium',
  mentions_legales: {
    siret: '21810032300014',
    publication_director: 'Jean-Pierre Martin',
    publication_director_title: 'Maire de Bellefontaine',
    hebergeur_name: 'Netlify, Inc.',
    hebergeur_address: '512 2nd Street, Suite 200, San Francisco, CA 94107, USA',
    hebergeur_phone: '+1 844-899-7312',
    credits: 'Site réalisé par CMS Mairies. Photos : Mairie de Bellefontaine, sauf mention contraire.',
  },
  rgpd: {
    dpo_name: 'Marie Durand',
    dpo_email: 'dpo@mairie-bellefontaine.fr',
    dpo_phone: '05 63 55 40 15',
    rgpd_policy:
      'La Mairie de Bellefontaine collecte vos données personnelles uniquement dans le cadre de ses missions de service public. Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification et de suppression de vos données. Pour exercer vos droits, contactez le DPO à dpo@mairie-bellefontaine.fr.',
  },
  accessibilite: {
    accessibility_level: 'non-conforme',
    accessibility_declaration:
      'La Mairie de Bellefontaine s\'engage à rendre son site internet accessible conformément à l\'article 47 de la loi n°2005-102 du 11 février 2005. Cette déclaration d\'accessibilité s\'applique au site mairie-bellefontaine.fr. Le site n\'a pas encore fait l\'objet d\'un audit de conformité RGAA.',
  },
  infos_pratiques: {
    opening_hours: {
      lundi: '8h30 - 12h00 / 14h00 - 17h00',
      mardi: '8h30 - 12h00 / 14h00 - 17h00',
      mercredi: '8h30 - 12h00',
      jeudi: '8h30 - 12h00 / 14h00 - 17h00',
      vendredi: '8h30 - 12h00 / 14h00 - 17h00',
      samedi: 'Fermé',
      dimanche: 'Fermé',
    },
    population: 1250,
  },
};

const TEST_USER = {
  username: 'marie.durand',
  email: 'marie.durand@mairie-bellefontaine.fr',
  password: 'Test123!',
  first_name: 'Marie',
  last_name: 'Durand',
  municipality_role: 'admin',
};

const TEST_PAGES = [
  {
    title: 'Accueil',
    slug: 'accueil',
    template: 'homepage',
    is_homepage: true,
    status: 'published',
    show_in_menu: true,
    menu_order: 0,
    meta_description: 'Bienvenue sur le site officiel de la Mairie de Bellefontaine',
    content:
      '# Bienvenue à Bellefontaine\n\nBienvenue sur le site officiel de la commune de Bellefontaine. Retrouvez ici toutes les informations pratiques, les actualités et les démarches administratives.\n\n## Actualités\n\nConsultez nos dernières actualités dans la rubrique dédiée.\n\n## Horaires d\'ouverture\n\nLa mairie vous accueille du lundi au vendredi. Consultez nos horaires détaillés sur la page Contact.',
  },
  {
    title: 'Mentions légales',
    slug: 'mentions-legales',
    template: 'default',
    is_homepage: false,
    status: 'published',
    show_in_menu: false,
    menu_order: 99,
    meta_description: 'Mentions légales du site de la Mairie de Bellefontaine',
    content:
      '# Mentions légales\n\nConformément aux dispositions de la loi n°2004-575 du 21 juin 2004 pour la confiance dans l\'économie numérique (LCEN), les mentions légales de ce site sont disponibles dans la configuration du site.\n\n## Éditeur\n\nMairie de Bellefontaine\n1 Place de la Mairie\n81170 Bellefontaine\nTél. : 05 63 55 40 12\nEmail : contact@mairie-bellefontaine.fr',
  },
  {
    title: 'Contact',
    slug: 'contact',
    template: 'contact',
    is_homepage: false,
    status: 'published',
    show_in_menu: true,
    menu_order: 10,
    meta_description: 'Contactez la Mairie de Bellefontaine',
    content:
      '# Nous contacter\n\n## Coordonnées\n\n**Mairie de Bellefontaine**\n1 Place de la Mairie\n81170 Bellefontaine\n\nTéléphone : 05 63 55 40 12\nEmail : contact@mairie-bellefontaine.fr\n\n## Horaires d\'ouverture\n\n- Lundi : 8h30 - 12h00 / 14h00 - 17h00\n- Mardi : 8h30 - 12h00 / 14h00 - 17h00\n- Mercredi : 8h30 - 12h00\n- Jeudi : 8h30 - 12h00 / 14h00 - 17h00\n- Vendredi : 8h30 - 12h00 / 14h00 - 17h00\n- Samedi et Dimanche : Fermé',
  },
];

// ============================================================================
// Helpers
// ============================================================================

function adminHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function getAdminToken() {
  // Try login first (admin already exists)
  try {
    const res = await axios.post(`${STRAPI_URL}/admin/login`, {
      email: ADMIN_CREDS.email,
      password: ADMIN_CREDS.password,
    });
    return res.data.data.token;
  } catch {
    // Login failed — try to register the first admin
  }

  const res = await axios.post(`${STRAPI_URL}/admin/register-admin`, {
    email: ADMIN_CREDS.email,
    password: ADMIN_CREDS.password,
    firstname: ADMIN_CREDS.firstname,
    lastname: ADMIN_CREDS.lastname,
  });
  return res.data.data.token;
}

/**
 * Generic find-or-create via Content Manager API.
 * - uid: Strapi content-type UID (e.g. "api::site.site")
 * - filters: object for query params (e.g. { slug: 'bellefontaine' })
 * - data: object to POST if not found
 * Returns the existing or newly created entry.
 */
async function findOrCreate(adminToken, uid, filters, data) {
  // Build filter query string
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    params.append(`filters[${key}][$eq]`, value);
  }
  params.append('pageSize', '1');

  const listRes = await axios.get(
    `${STRAPI_URL}/content-manager/collection-types/${uid}?${params.toString()}`,
    { headers: adminHeaders(adminToken) }
  );

  const results = listRes.data.results || [];
  if (results.length > 0) {
    return { entry: results[0], created: false };
  }

  const createRes = await axios.post(
    `${STRAPI_URL}/content-manager/collection-types/${uid}`,
    data,
    { headers: adminHeaders(adminToken) }
  );

  // Content Manager wraps single-entry responses in { data: { ... } }
  const created = createRes.data.data || createRes.data;
  return { entry: created, created: true };
}

// ============================================================================
// Setup functions
// ============================================================================

async function setupSite(adminToken) {
  const { entry, created } = await findOrCreate(
    adminToken,
    'api::site.site',
    { slug: TEST_SITE.slug },
    TEST_SITE
  );

  console.log(
    created
      ? `  ✓ Site créé : ${entry.name} (${entry.documentId})`
      : `  ✓ Site existant : ${entry.name} (${entry.documentId})`
  );

  return entry;
}

async function setupPermissions(adminToken) {
  // Get the Authenticated role
  const rolesRes = await axios.get(`${STRAPI_URL}/users-permissions/roles`, {
    headers: adminHeaders(adminToken),
  });

  const authRole = rolesRes.data.roles.find((r) => r.type === 'authenticated');
  if (!authRole) throw new Error('Rôle Authenticated introuvable');

  // Get current role detail to preserve existing permissions structure
  const roleDetail = await axios.get(
    `${STRAPI_URL}/users-permissions/roles/${authRole.id}`,
    { headers: adminHeaders(adminToken) }
  );
  const permissions = roleDetail.data.role.permissions;

  // Enable CRUD for our content types
  // Format: { "api::page": { controllers: { page: { find: { enabled: true, policy: "" } } } } }
  const toEnable = [
    { ns: 'api::page', controller: 'page' },
    { ns: 'api::article', controller: 'article' },
    { ns: 'api::evenement', controller: 'evenement' },
    { ns: 'api::site', controller: 'site' },
    { ns: 'api::official-document', controller: 'official-document' },
  ];
  const actions = ['find', 'findOne', 'create', 'update', 'delete'];

  for (const { ns, controller } of toEnable) {
    if (!permissions[ns]) permissions[ns] = { controllers: {} };
    if (!permissions[ns].controllers) permissions[ns].controllers = {};
    if (!permissions[ns].controllers[controller]) permissions[ns].controllers[controller] = {};
    for (const action of actions) {
      permissions[ns].controllers[controller][action] = { enabled: true, policy: '' };
    }
  }

  // Deployment custom actions (not standard CRUD)
  const deploymentActions = ['trigger', 'status', 'check', 'debug'];
  if (!permissions['api::deployment']) permissions['api::deployment'] = { controllers: {} };
  if (!permissions['api::deployment'].controllers) permissions['api::deployment'].controllers = {};
  if (!permissions['api::deployment'].controllers['deployment'])
    permissions['api::deployment'].controllers['deployment'] = {};
  for (const action of deploymentActions) {
    permissions['api::deployment'].controllers['deployment'][action] = { enabled: true, policy: '' };
  }

  await axios.put(
    `${STRAPI_URL}/users-permissions/roles/${authRole.id}`,
    { permissions },
    { headers: adminHeaders(adminToken) }
  );

  console.log(`  ✓ Permissions configurées pour le rôle Authenticated (${toEnable.length} content-types)`);
}

async function setupUser(adminToken, siteDocumentId) {
  // Find the Authenticated role to assign it
  const rolesRes = await axios.get(`${STRAPI_URL}/users-permissions/roles`, {
    headers: adminHeaders(adminToken),
  });
  const authRole = rolesRes.data.roles.find((r) => r.type === 'authenticated');

  // Check if user already exists
  const params = new URLSearchParams();
  params.append('filters[email][$eq]', TEST_USER.email);
  params.append('pageSize', '1');

  const listRes = await axios.get(
    `${STRAPI_URL}/content-manager/collection-types/plugin::users-permissions.user?${params.toString()}`,
    { headers: adminHeaders(adminToken) }
  );

  const results = listRes.data.results || [];
  if (results.length > 0) {
    console.log(`  ✓ Utilisateur existant : ${results[0].email}`);
    return results[0];
  }

  // Create user with all required fields
  const createRes = await axios.post(
    `${STRAPI_URL}/content-manager/collection-types/plugin::users-permissions.user`,
    {
      username: TEST_USER.username,
      email: TEST_USER.email,
      password: TEST_USER.password,
      confirmed: true,
      blocked: false,
      role: authRole.id,
      site: { connect: [{ documentId: siteDocumentId }] },
      first_name: TEST_USER.first_name,
      last_name: TEST_USER.last_name,
      municipality_role: TEST_USER.municipality_role,
      active: true,
    },
    { headers: adminHeaders(adminToken) }
  );

  const user = createRes.data.data || createRes.data;
  console.log(`  ✓ Utilisateur créé : ${user.email}`);
  return user;
}

async function setupPages(adminToken, siteDocumentId) {
  let created = 0;
  let existing = 0;

  for (const page of TEST_PAGES) {
    const { entry, created: isNew } = await findOrCreate(
      adminToken,
      'api::page.page',
      { slug: page.slug },
      {
        ...page,
        site: { connect: [{ documentId: siteDocumentId }] },
      }
    );

    if (isNew) {
      created++;
    } else {
      existing++;
    }
  }

  console.log(`  ✓ Pages : ${created} créée(s), ${existing} existante(s)`);
}

async function verifySetup() {
  // Login as the test user
  const loginRes = await axios.post(`${STRAPI_URL}/api/auth/local`, {
    identifier: TEST_USER.email,
    password: TEST_USER.password,
  });
  const jwt = loginRes.data.jwt;
  console.log('  ✓ Login utilisateur OK');

  // Test page access
  const pagesRes = await axios.get(`${STRAPI_URL}/api/pages`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const pageCount = pagesRes.data.data?.length ?? 0;
  console.log(`  ✓ Accès pages OK (${pageCount} page(s))`);

  // Test site access via /me
  const meRes = await axios.get(`${STRAPI_URL}/api/users/me?populate=site`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const siteName = meRes.data.site?.name || 'non assigné';
  console.log(`  ✓ Site assigné OK (${siteName})`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(`\nSetup environnement de dev — ${STRAPI_URL}\n`);

  try {
    // 1. Admin auth
    console.log('[1/5] Authentification admin...');
    const adminToken = await getAdminToken();
    console.log('  ✓ Admin connecté\n');

    // 2. Site
    console.log('[2/5] Création du site...');
    const site = await setupSite(adminToken);
    console.log('');

    // 3. Permissions
    console.log('[3/5] Configuration des permissions...');
    await setupPermissions(adminToken);
    console.log('');

    // 4. User
    console.log('[4/5] Création de l\'utilisateur...');
    await setupUser(adminToken, site.documentId);
    console.log('');

    // 5. Pages
    console.log('[5/5] Création des pages...');
    await setupPages(adminToken, site.documentId);
    console.log('');

    // Verify
    console.log('Vérification du setup...');
    await verifySetup();

    console.log('\n=== Setup terminé ===');
    console.log(`  URL admin    : http://localhost:5173`);
    console.log(`  Email        : ${TEST_USER.email}`);
    console.log(`  Mot de passe : ${TEST_USER.password}`);
    console.log('');
  } catch (error) {
    console.error('\n❌ Erreur fatale :', error.response?.data?.error?.message || error.message);

    if (error.response?.data) {
      console.error('  Détails :', JSON.stringify(error.response.data, null, 2));
    }

    console.error('\n--- Guide de dépannage ---');
    console.error(`  1. Vérifier que Strapi tourne sur ${STRAPI_URL}`);
    console.error('  2. Vérifier que la base de données est accessible');
    console.error(
      '  3. Si l\'admin existe avec d\'autres credentials, utiliser :\n' +
        '     ADMIN_EMAIL=... ADMIN_PASSWORD=... node create-test-user.js'
    );
    console.error('');

    process.exit(1);
  }
}

main();
