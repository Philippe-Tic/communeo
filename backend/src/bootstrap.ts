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

    // Créer un site de test s'il n'existe pas
    let testSite = await strapi.entityService.findMany('api::site.site', {
      filters: { slug: 'test-site' },
    });

    if (!testSite || testSite.length === 0) {
      testSite = await strapi.entityService.create('api::site.site', {
        data: {
          name: 'Test Site',
          slug: 'test-site',
          theme: 'moderne',
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
      testUser = await strapi.query('plugin::users-permissions.user').create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          password: await strapi.service('plugin::users-permissions.user').hashPassword('test123'),
          confirmed: true,
          blocked: false,
          role: authenticatedRole.id,
          site: testSite.documentId,
          municipality_role: 'editor',
          first_name: 'Test',
          last_name: 'User',
          active: true,
        },
      });
      console.log('✅ Bootstrap - Created test user:', testUser.id);
    } else {
      // Mettre à jour l'utilisateur existant avec le site
      await strapi.query('plugin::users-permissions.user').update({
        where: { id: testUser.id },
        data: {
          site: testSite.documentId,
        },
      });
      console.log('✅ Bootstrap - Updated existing test user:', testUser.id);
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
      { action: 'api::site.site.create', enabled: true },
      { action: 'api::site.site.update', enabled: true },
      { action: 'api::site.site.delete', enabled: true },
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

    // Créer quelques pages de test
    const existingPages = await strapi.entityService.findMany('api::page.page', {
      filters: { site: { documentId: testSite.documentId } },
    });

    if (!existingPages || existingPages.length === 0) {
      const testPage = await strapi.entityService.create('api::page.page', {
        data: {
          title: 'Page de test',
          slug: 'page-de-test',
          content: 'Contenu de la page de test',
          status: 'published',
          site: testSite.documentId,
          template: 'default',
          menu_order: 0,
          show_in_menu: true,
          is_homepage: false,
        },
      });
      console.log('✅ Bootstrap - Created test page:', testPage.documentId);
    }

    console.log('🎉 Bootstrap - Permissions setup completed!');
  } catch (error) {
    console.log('❌ Bootstrap - Error during permissions setup:', error);
  }
};
