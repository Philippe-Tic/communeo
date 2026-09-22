/**
 * Données initiales.
 * - Hors production : site « test-site », comptes test@example.com (admin) et super@example.com
 *   (super admin), page de test. Utilisés par les tests d'intégration.
 * - En production : super admin et premier admin, uniquement si les variables SEED_* sont fournies.
 */

async function hash(strapi: any, password: string) {
  return (await strapi.plugin('users-permissions').service('user').ensureHashedPasswords({ password })).password;
}

async function authenticatedRoleId(strapi: any) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  return role.id;
}

async function findOrCreateSite(strapi: any, data: { name: string; slug: string; contact_mail: string }) {
  const existing = await strapi.documents('api::site.site').findFirst({ filters: { slug: data.slug } });
  return existing ?? strapi.documents('api::site.site').create({ data });
}

async function ensureUser(strapi: any, email: string, data: Record<string, unknown>, password: string) {
  const users = strapi.db.query('plugin::users-permissions.user');
  if (await users.findOne({ where: { email } })) return false;
  await users.create({
    data: {
      email,
      username: (data.username as string) ?? email,
      password: await hash(strapi, password),
      provider: 'local',
      confirmed: true,
      blocked: false,
      active: true,
      role: await authenticatedRoleId(strapi),
      ...data,
    },
  });
  strapi.log.info(`[seed] Compte créé : ${email}`);
  return true;
}

export async function seedDevelopment(strapi: any) {
  const site = await findOrCreateSite(strapi, { name: 'Test Site', slug: 'test-site', contact_mail: 'test@example.com' });

  await ensureUser(
    strapi,
    'test@example.com',
    { username: 'testuser', site: site.id, municipality_role: 'admin', first_name: 'Test', last_name: 'User' },
    'test123',
  );
  await ensureUser(
    strapi,
    'super@example.com',
    { username: 'superadmin', municipality_role: 'super_admin', first_name: 'Super', last_name: 'Admin' },
    'super123',
  );

  const pages = await strapi.documents('api::page.page').findMany({ filters: { site: { documentId: site.documentId } }, limit: 1 });
  if (!pages.length) {
    await strapi.documents('api::page.page').create({
      status: 'published',
      data: {
        title: 'Page de test',
        slug: 'page-de-test',
        show_in_menu: true,
        site: site.documentId,
        blocks: [
          {
            __component: 'blocks.text',
            body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contenu de la page de test' }] }] },
          },
        ],
      },
    });
  }
}

export async function seedProduction(strapi: any) {
  const { SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;

  if (SEED_SUPER_ADMIN_EMAIL && SEED_SUPER_ADMIN_PASSWORD) {
    await ensureUser(
      strapi,
      SEED_SUPER_ADMIN_EMAIL,
      { municipality_role: 'super_admin', first_name: 'Super', last_name: 'Admin' },
      SEED_SUPER_ADMIN_PASSWORD,
    );
  }

  // Premier admin de commune : seulement sur une base vide de communes, et jamais avec un mot de passe par défaut
  if (SEED_ADMIN_EMAIL && SEED_ADMIN_PASSWORD) {
    const sitesCount = await strapi.db.query('api::site.site').count();
    if (sitesCount === 0) {
      const siteName = process.env.SEED_SITE_NAME || 'Ma Commune';
      const site = await findOrCreateSite(strapi, {
        name: siteName,
        slug: process.env.SEED_SITE_SLUG || 'ma-commune',
        contact_mail: SEED_ADMIN_EMAIL,
      });
      await ensureUser(
        strapi,
        SEED_ADMIN_EMAIL,
        { site: site.id, municipality_role: 'admin', first_name: 'Admin', last_name: siteName },
        SEED_ADMIN_PASSWORD,
      );
    }
  }
}
