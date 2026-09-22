export default async ({ strapi }) => {
  console.log('🚀 Bootstrap - Setting up permissions...');

  try {
    // Récupérer le rôle "Authenticated"
    const authenticatedRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    if (!authenticatedRole) {
      console.log('❌ Bootstrap - Authenticated role not found');
      return;
    }

    console.log('✅ Bootstrap - Found authenticated role:', authenticatedRole.id);

    // --- Données de test : uniquement en développement ---
    if (process.env.NODE_ENV !== 'production') {
      // Créer un site de test s'il n'existe pas
      let testSite = await strapi.entityService.findMany('api::site.site', {
        filters: { slug: 'test-site' },
      });

      if (!testSite || testSite.length === 0) {
        testSite = await strapi.entityService.create('api::site.site', {
          data: {
            name: 'Test Site',
            slug: 'test-site',
            contact_mail: 'test@example.com',
            contact_phone: '0123456789',
            address: '123 Test Street',
          },
        });
        console.log('✅ Bootstrap - Created test site:', testSite.documentId);
      } else {
        testSite = testSite[0];
        console.log('✅ Bootstrap - Found existing test site:', testSite.documentId);
      }

      // Créer un utilisateur de test s'il n'existe pas
      let testUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: 'test@example.com' },
      });

      if (!testUser) {
        try {
          // In Strapi v5, use the plugin service to hash passwords
          const userService = strapi.plugin('users-permissions').service('user');
          const hashedPassword = (await userService.ensureHashedPasswords({ password: 'test123' })).password;
          testUser = await strapi.query('plugin::users-permissions.user').create({
            data: {
              username: 'testuser',
              email: 'test@example.com',
              password: hashedPassword,
              provider: 'local',
              confirmed: true,
              blocked: false,
              role: authenticatedRole.id,
              site: testSite.id,
              municipality_role: 'admin',
              first_name: 'Test',
              last_name: 'User',
              active: true,
            },
          });
          console.log('✅ Bootstrap - Created test user:', testUser.id);
        } catch (error) {
          console.log('⚠️ Bootstrap - Could not create test user:', error.message);
        }
      } else {
        // Mettre à jour l'utilisateur existant avec le site
        await strapi.query('plugin::users-permissions.user').update({
          where: { id: testUser.id },
          data: {
            site: testSite.id,
          },
        });
        console.log('✅ Bootstrap - Updated existing test user:', testUser.id);
      }

      // Créer un super admin de test s'il n'existe pas
      let superAdmin = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: 'super@example.com' },
      });

      if (!superAdmin) {
        try {
          const userService = strapi.plugin('users-permissions').service('user');
          const hashedPassword = (await userService.ensureHashedPasswords({ password: 'super123' })).password;
          superAdmin = await strapi.query('plugin::users-permissions.user').create({
            data: {
              username: 'superadmin',
              email: 'super@example.com',
              password: hashedPassword,
              provider: 'local',
              confirmed: true,
              blocked: false,
              role: authenticatedRole.id,
              municipality_role: 'super_admin',
              first_name: 'Super',
              last_name: 'Admin',
              active: true,
            },
          });
          console.log('✅ Bootstrap - Created super admin:', superAdmin.id);
        } catch (error) {
          console.log('⚠️ Bootstrap - Could not create super admin:', error.message);
        }
      } else {
        console.log('✅ Bootstrap - Found existing super admin:', superAdmin.id);
      }
    } else {
      console.log('ℹ️ Bootstrap - Production mode: skipping test data creation');

      // --- Seed production : super admin (optionnel via env vars) ---
      const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
      const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;

      if (superAdminEmail && superAdminPassword) {
        const existingSuperAdmin = await strapi.query('plugin::users-permissions.user').findOne({
          where: { email: superAdminEmail },
        });

        if (!existingSuperAdmin) {
          try {
            const userService = strapi.plugin('users-permissions').service('user');
            const hashedPassword = (await userService.ensureHashedPasswords({ password: superAdminPassword })).password;
            await strapi.query('plugin::users-permissions.user').create({
              data: {
                username: superAdminEmail,
                email: superAdminEmail,
                password: hashedPassword,
                provider: 'local',
                confirmed: true,
                blocked: false,
                role: authenticatedRole.id,
                municipality_role: 'super_admin',
                first_name: 'Super',
                last_name: 'Admin',
                active: true,
              },
            });
            console.log('✅ Bootstrap - Created production super admin:', superAdminEmail);
          } catch (error) {
            console.log('❌ Bootstrap - Could not create super admin:', error.message);
          }
        }
      }

      // --- Seed production : premier admin ---
      const userCount = await strapi.query('plugin::users-permissions.user').count();
      if (userCount === 0 && !process.env.SEED_ADMIN_PASSWORD) {
        console.log('⚠️ Bootstrap - No users and SEED_ADMIN_PASSWORD not set: skipping initial admin creation');
      } else if (userCount === 0) {
        console.log('🌱 Bootstrap - No users found, creating initial admin...');

        const siteName = process.env.SEED_SITE_NAME || 'Ma Commune';
        const siteSlug = process.env.SEED_SITE_SLUG || 'ma-commune';
        const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@communeo.fr';
        const adminPassword = process.env.SEED_ADMIN_PASSWORD;

        let seedSites = await strapi.entityService.findMany('api::site.site', {
          filters: { slug: siteSlug },
        });

        let seedSite;
        if (!seedSites || seedSites.length === 0) {
          seedSite = await strapi.entityService.create('api::site.site', {
            data: {
              name: siteName,
              slug: siteSlug,
              contact_mail: adminEmail,
              contact_phone: '',
              address: '',
            },
          });
          console.log('✅ Bootstrap - Created seed site:', seedSite.documentId);
        } else {
          seedSite = seedSites[0];
        }

        try {
          const userService = strapi.plugin('users-permissions').service('user');
          const hashedPassword = (await userService.ensureHashedPasswords({ password: adminPassword })).password;
          const admin = await strapi.query('plugin::users-permissions.user').create({
            data: {
              username: adminEmail,
              email: adminEmail,
              password: hashedPassword,
              provider: 'local',
              confirmed: true,
              blocked: false,
              role: authenticatedRole.id,
              site: seedSite.id,
              municipality_role: 'admin',
              first_name: 'Admin',
              last_name: siteName,
              active: true,
            },
          });
          console.log('✅ Bootstrap - Created seed admin:', admin.email);
        } catch (error) {
          console.log('❌ Bootstrap - Could not create seed admin:', error.message);
        }
      }
    }

    // Désactiver l'inscription publique (activée par défaut dans users-permissions)
    const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const advancedSettings = (await pluginStore.get({ key: 'advanced' })) || {};
    if (advancedSettings.allow_register !== false) {
      await pluginStore.set({ key: 'advanced', value: { ...advancedSettings, allow_register: false } });
      console.log('✅ Bootstrap - Public registration disabled');
    }

    // Définir les permissions à accorder
    const permissionsToSet = [
      // Pages
      { action: 'api::page.page.find', enabled: true },
      { action: 'api::page.page.findOne', enabled: true },
      { action: 'api::page.page.create', enabled: true },
      { action: 'api::page.page.update', enabled: true },
      { action: 'api::page.page.delete', enabled: true },

      // Articles
      { action: 'api::article.article.find', enabled: true },
      { action: 'api::article.article.findOne', enabled: true },
      { action: 'api::article.article.create', enabled: true },
      { action: 'api::article.article.update', enabled: true },
      { action: 'api::article.article.delete', enabled: true },

      // Evenements
      { action: 'api::evenement.evenement.find', enabled: true },
      { action: 'api::evenement.evenement.findOne', enabled: true },
      { action: 'api::evenement.evenement.create', enabled: true },
      { action: 'api::evenement.evenement.update', enabled: true },
      { action: 'api::evenement.evenement.delete', enabled: true },

      // Sites
      { action: 'api::site.site.find', enabled: true },
      { action: 'api::site.site.findOne', enabled: true },
      { action: 'api::site.site.create', enabled: false },
      { action: 'api::site.site.update', enabled: true },
      { action: 'api::site.site.delete', enabled: false },

      // Contact Submissions
      { action: 'api::contact-submission.contact-submission.find', enabled: true },
      { action: 'api::contact-submission.contact-submission.findOne', enabled: true },
      { action: 'api::contact-submission.contact-submission.create', enabled: true },
      { action: 'api::contact-submission.contact-submission.update', enabled: true },
      { action: 'api::contact-submission.contact-submission.delete', enabled: true },

      // Official Documents
      { action: 'api::official-document.official-document.find', enabled: true },
      { action: 'api::official-document.official-document.findOne', enabled: true },
      { action: 'api::official-document.official-document.create', enabled: true },
      { action: 'api::official-document.official-document.update', enabled: true },
      { action: 'api::official-document.official-document.delete', enabled: true },

      // Team Members
      { action: 'api::team-member.team-member.find', enabled: true },
      { action: 'api::team-member.team-member.findOne', enabled: true },
      { action: 'api::team-member.team-member.create', enabled: true },
      { action: 'api::team-member.team-member.update', enabled: true },
      { action: 'api::team-member.team-member.delete', enabled: true },

      // Associations
      { action: 'api::association.association.find', enabled: true },
      { action: 'api::association.association.findOne', enabled: true },
      { action: 'api::association.association.create', enabled: true },
      { action: 'api::association.association.update', enabled: true },
      { action: 'api::association.association.delete', enabled: true },

      // Alertes
      { action: 'api::alerte.alerte.find', enabled: true },
      { action: 'api::alerte.alerte.findOne', enabled: true },
      { action: 'api::alerte.alerte.create', enabled: true },
      { action: 'api::alerte.alerte.update', enabled: true },
      { action: 'api::alerte.alerte.delete', enabled: true },

      // Waste Schedules
      { action: 'api::waste-schedule.waste-schedule.find', enabled: true },
      { action: 'api::waste-schedule.waste-schedule.findOne', enabled: true },
      { action: 'api::waste-schedule.waste-schedule.create', enabled: true },
      { action: 'api::waste-schedule.waste-schedule.update', enabled: true },
      { action: 'api::waste-schedule.waste-schedule.delete', enabled: true },

      // School Menus
      { action: 'api::school-menu.school-menu.find', enabled: true },
      { action: 'api::school-menu.school-menu.findOne', enabled: true },
      { action: 'api::school-menu.school-menu.create', enabled: true },
      { action: 'api::school-menu.school-menu.update', enabled: true },
      { action: 'api::school-menu.school-menu.delete', enabled: true },

      // Media Items
      { action: 'api::media-item.media-item.find', enabled: true },
      { action: 'api::media-item.media-item.findOne', enabled: true },
      { action: 'api::media-item.media-item.create', enabled: true },
      { action: 'api::media-item.media-item.update', enabled: true },
      { action: 'api::media-item.media-item.delete', enabled: true },
      { action: 'api::media-item.media-item.upload', enabled: true },

      // Upload (needed for file uploads)
      { action: 'plugin::upload.content-api.upload', enabled: true },
      { action: 'plugin::upload.content-api.find', enabled: false },
      { action: 'plugin::upload.content-api.findOne', enabled: false },
      { action: 'plugin::upload.content-api.destroy', enabled: false },

      // Deployment (custom actions)
      { action: 'api::deployment.deployment.trigger', enabled: true },
      { action: 'api::deployment.deployment.status', enabled: true },
      { action: 'api::deployment.deployment.check', enabled: true },
      { action: 'api::deployment.deployment.debug', enabled: false },

      // Domain (custom actions)
      { action: 'api::domain.domain.configure', enabled: true },
      { action: 'api::domain.domain.verify', enabled: true },
      { action: 'api::domain.domain.remove', enabled: true },
      { action: 'api::domain.domain.status', enabled: true },
      { action: 'api::domain.domain.diagnostic', enabled: true },

      // User Management (custom actions)
      { action: 'api::user-management.user-management.find', enabled: true },
      { action: 'api::user-management.user-management.findOne', enabled: true },
      { action: 'api::user-management.user-management.create', enabled: true },
      { action: 'api::user-management.user-management.update', enabled: true },
      { action: 'api::user-management.user-management.delete', enabled: true },
      { action: 'api::user-management.user-management.resendInvitation', enabled: true },
      { action: 'api::user-management.user-management.resetPassword', enabled: true },
      { action: 'api::user-management.user-management.updateMe', enabled: true },
      { action: 'api::user-management.user-management.requestPasswordReset', enabled: true },

      // Site Management (super admin)
      { action: 'api::site-management.site-management.find', enabled: true },
      { action: 'api::site-management.site-management.findOne', enabled: true },
      { action: 'api::site-management.site-management.stats', enabled: true },
      { action: 'api::site-management.site-management.create', enabled: true },
      { action: 'api::site-management.site-management.update', enabled: true },
      { action: 'api::site-management.site-management.delete', enabled: true },

      // Comarquage (custom actions)
      { action: 'api::comarquage.comarquage.categories', enabled: true },
      { action: 'api::comarquage.comarquage.fiche', enabled: true },
      { action: 'api::comarquage.comarquage.search', enabled: true },
      { action: 'api::comarquage.comarquage.invalidateCache', enabled: true },
      { action: 'api::comarquage.comarquage.cacheStatus', enabled: true },

      // Newsletter Subscribers
      { action: 'api::newsletter-subscriber.newsletter-subscriber.find', enabled: true },
      { action: 'api::newsletter-subscriber.newsletter-subscriber.findOne', enabled: true },
      { action: 'api::newsletter-subscriber.newsletter-subscriber.create', enabled: true },
      { action: 'api::newsletter-subscriber.newsletter-subscriber.update', enabled: true },
      { action: 'api::newsletter-subscriber.newsletter-subscriber.delete', enabled: true },
      { action: 'api::newsletter-subscriber.newsletter-subscriber.stats', enabled: true },

      // Gestion native des utilisateurs : passe uniquement par /api/user-management
      { action: 'plugin::users-permissions.user.find', enabled: false },
      { action: 'plugin::users-permissions.user.findOne', enabled: false },
      { action: 'plugin::users-permissions.user.count', enabled: false },
      { action: 'plugin::users-permissions.user.create', enabled: false },
      { action: 'plugin::users-permissions.user.update', enabled: false },
      { action: 'plugin::users-permissions.user.destroy', enabled: false },
    ];

    // Appliquer les permissions
    for (const permission of permissionsToSet) {
      try {
        // Chercher la permission existante
        const existingPermission = await strapi.query('plugin::users-permissions.permission').findOne({
          where: {
            action: permission.action,
            role: authenticatedRole.id,
          },
        });

        if (existingPermission) {
          // Mettre à jour la permission existante
          await strapi.query('plugin::users-permissions.permission').update({
            where: { id: existingPermission.id },
            data: { enabled: permission.enabled },
          });
          console.log(`✅ Bootstrap - Updated permission: ${permission.action}`);
        } else {
          // Créer une nouvelle permission
          await strapi.query('plugin::users-permissions.permission').create({
            data: {
              action: permission.action,
              enabled: permission.enabled,
              role: authenticatedRole.id,
            },
          });
          console.log(`✅ Bootstrap - Created permission: ${permission.action}`);
        }
      } catch (error) {
        console.log(`❌ Bootstrap - Error setting permission ${permission.action}:`, error.message);
      }
    }

    // Permissions publiques pour le formulaire de contact SVE
    const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });

    if (publicRole) {
      const publicPermissions = [
        { action: 'api::contact-submission.contact-submission.publicCreate', enabled: true },
        { action: 'api::association.association.publicCreate', enabled: true },
        { action: 'api::user-management.user-management.acceptInvitation', enabled: true },
        { action: 'api::newsletter-subscriber.newsletter-subscriber.publicSubscribe', enabled: true },
        { action: 'api::newsletter-subscriber.newsletter-subscriber.publicUnsubscribe', enabled: true },
        // Pas d'inscription publique : les comptes sont créés par invitation
        { action: 'plugin::users-permissions.auth.register', enabled: false },
      ];

      for (const permission of publicPermissions) {
        try {
          const existingPermission = await strapi.query('plugin::users-permissions.permission').findOne({
            where: {
              action: permission.action,
              role: publicRole.id,
            },
          });

          if (existingPermission) {
            await strapi.query('plugin::users-permissions.permission').update({
              where: { id: existingPermission.id },
              data: { enabled: permission.enabled },
            });
            console.log(`✅ Bootstrap - Updated public permission: ${permission.action}`);
          } else {
            await strapi.query('plugin::users-permissions.permission').create({
              data: {
                action: permission.action,
                enabled: permission.enabled,
                role: publicRole.id,
              },
            });
            console.log(`✅ Bootstrap - Created public permission: ${permission.action}`);
          }
        } catch (error) {
          console.log(`❌ Bootstrap - Error setting public permission ${permission.action}:`, error.message);
        }
      }
    }

    // Migrate navigation_config: old { type: 'section', key } → { type: 'link', linkKey }
    // Also clear parent_page from existing pages
    const knex = strapi.db.connection;
    try {
      const sitesWithNav = await knex('sites').whereNotNull('navigation_config');
      for (const site of sitesWithNav) {
        try {
          const config = typeof site.navigation_config === 'string'
            ? JSON.parse(site.navigation_config)
            : site.navigation_config;
          if (!Array.isArray(config)) continue;
          let changed = false;
          const migrated = config.map((item: any) => {
            if (item.type === 'section' && item.key && !item.children) {
              changed = true;
              const { key, ...rest } = item;
              return { ...rest, type: 'link', linkKey: key };
            }
            return item;
          });
          if (changed) {
            await knex('sites').where('id', site.id).update({
              navigation_config: JSON.stringify(migrated),
            });
            console.log(`✅ Bootstrap - Migrated navigation_config for site ${site.id}`);
          }
        } catch {
          // Skip sites with invalid JSON
        }
      }
      // Clear parent_page relations from pages (only if the link table still exists)
      const hasTable = await knex.schema.hasTable('pages_parent_page_lnk');
      if (hasTable) {
        const count = await knex('pages_parent_page_lnk').del();
        if (count > 0) console.log(`✅ Bootstrap - Cleared ${count} parent_page links`);
      }
    } catch (error) {
      console.log('⚠️ Bootstrap - Navigation migration skipped:', (error as Error).message);
    }

    // Migrate old roles to new roles (mayor/deputy → admin, secretary → editor)
    const migrated = await knex('up_users')
      .whereIn('municipality_role', ['mayor', 'deputy'])
      .update({ municipality_role: 'admin' });
    const migratedSecretary = await knex('up_users')
      .where('municipality_role', 'secretary')
      .update({ municipality_role: 'editor' });
    if (migrated > 0 || migratedSecretary > 0) {
      console.log(`✅ Bootstrap - Migrated roles: ${migrated} → admin, ${migratedSecretary} → editor`);
    }

    // Créer quelques pages de test (uniquement en développement)
    if (process.env.NODE_ENV !== 'production') {
      const testSiteForPages = await strapi.entityService.findMany('api::site.site', {
        filters: { slug: 'test-site' },
      });
      const testSite = testSiteForPages?.[0];

      if (testSite) {
        const existingPages = await strapi.documents('api::page.page').findMany({
          filters: { site: { documentId: testSite.documentId } },
        });

        if (!existingPages || existingPages.length === 0) {
          const testPage = await strapi.documents('api::page.page').create({
            status: 'published',
            data: {
              title: 'Page de test',
              slug: 'page-de-test',
              blocks: [
                {
                  __component: 'blocks.text',
                  body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contenu de la page de test' }] }] },
                },
              ],
              site: testSite.documentId,
              menu_order: 0,
              show_in_menu: true,
            },
          });
          console.log('✅ Bootstrap - Created test page:', testPage.documentId);
        }
      }
    }

    // Auto-create API token for builds if not configured
    if (!process.env.STRAPI_API_TOKEN) {
      try {
        const tokenService = strapi.service('admin::api-token');
        const existingTokens = await strapi.query('admin::api-token').findMany({
          where: { name: 'Build Token' },
        });

        if (existingTokens.length === 0) {
          // Lecture seule, limitée aux contenus publiés sur les sites (pas de données personnelles)
          const readable = ['site', 'page', 'article', 'evenement', 'official-document', 'team-member', 'association', 'alerte', 'waste-schedule', 'school-menu'];
          const token = await tokenService.create({
            name: 'Build Token',
            type: 'custom',
            lifespan: null,
            description: 'Auto-generated read-only token for Astro site builds',
            permissions: [
              ...readable.flatMap((name) => [`api::${name}.${name}.find`, `api::${name}.${name}.findOne`]),
              'api::comarquage.comarquage.categories',
              'api::comarquage.comarquage.fiche',
              'api::comarquage.comarquage.search',
              'plugin::upload.content-api.find',
              'plugin::upload.content-api.findOne',
            ],
          });
          console.log('='.repeat(60));
          console.log('  API TOKEN CREATED FOR BUILDS');
          console.log('  Add this to your .env file on the VPS:');
          console.log(`  STRAPI_API_TOKEN=${token.accessKey}`);
          console.log('  Then restart: docker compose up -d strapi');
          console.log('='.repeat(60));
        } else {
          if (existingTokens[0].type === 'full-access') {
            console.warn('⚠️  Bootstrap - The existing Build Token is full-access: delete it in Strapi admin and restart to regenerate a read-only one.');
          }
          console.log('ℹ️  Bootstrap - Build Token exists but STRAPI_API_TOKEN env var not set');
          console.log('   If you lost the token, delete it in Strapi admin and restart to regenerate.');
        }
      } catch (error) {
        console.warn('⚠️  Bootstrap - Could not auto-create API token:', error.message);
        console.warn('   Create one manually at https://{DOMAIN}/admin > Settings > API Tokens');
      }
    }

    console.log('🎉 Bootstrap - Permissions setup completed!');
  } catch (error) {
    console.log('❌ Bootstrap - Error during permissions setup:', error);
  }
};
