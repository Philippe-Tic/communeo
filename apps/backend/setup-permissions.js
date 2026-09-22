const axios = require('axios');

async function setupPermissions() {
  try {
    console.log('🔧 Configuration des permissions...');

    // Créer un utilisateur admin directement dans la base de données
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./db.sqlite');

    // Mettre à jour toutes les permissions pour le rôle authenticated (type = 'authenticated')
    const permissionsToEnable = [
      'api::page.page.find',
      'api::page.page.findOne',
      'api::page.page.create',
      'api::page.page.update',
      'api::page.page.delete',
      'api::article.article.find',
      'api::article.article.findOne',
      'api::article.article.create',
      'api::article.article.update',
      'api::article.article.delete',
      'api::evenement.evenement.find',
      'api::evenement.evenement.findOne',
      'api::evenement.evenement.create',
      'api::evenement.evenement.update',
      'api::evenement.evenement.delete',
      'api::site.site.find',
      'api::site.site.findOne',
      'api::site.site.create',
      'api::site.site.update',
      'api::site.site.delete'
    ];

    // Trouver le rôle authenticated
    db.get("SELECT id FROM up_roles WHERE type = 'authenticated'", (err, role) => {
      if (err) {
        console.error('❌ Erreur lors de la récupération du rôle:', err);
        return;
      }

      if (!role) {
        console.error('❌ Rôle authenticated non trouvé');
        return;
      }

      console.log('✅ Rôle authenticated trouvé:', role.id);

      // Activer toutes les permissions pour ce rôle
      permissionsToEnable.forEach(permission => {
        db.run(
          `INSERT OR REPLACE INTO up_permissions (action, enabled, role) VALUES (?, 1, ?)`,
          [permission, role.id],
          (err) => {
            if (err) {
              console.error(`❌ Erreur lors de l'activation de ${permission}:`, err);
            } else {
              console.log(`✅ Permission activée: ${permission}`);
            }
          }
        );
      });

      // Fermer la base de données après un délai
      setTimeout(() => {
        db.close();
        console.log('🎉 Configuration terminée!');

        // Tester l'accès aux pages
        testAccess();
      }, 2000);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

async function testAccess() {
  try {
    console.log('📝 Test d\'accès aux pages...');

    const response = await axios.get('http://localhost:1337/api/pages', {
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNzUyNTM5MDA0LCJleHAiOjE3NTUxMzEwMDR9.u9TcvQvmdH9_RAeQ8CrZRSfajWT8W65oTHaX8RfmroE`
      }
    });

    console.log('✅ Accès réussi! Réponse:', response.data);

  } catch (error) {
    console.error('❌ Erreur d\'accès:', error.response?.data || error.message);
  }
}

setupPermissions();
