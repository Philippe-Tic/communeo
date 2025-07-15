const axios = require('axios');

async function configurePermissions() {
  try {
    // 1. Créer un admin user temporaire
    console.log('📝 Création d\'un admin temporaire...');

    const adminResponse = await axios.post('http://localhost:1337/admin/register-admin', {
      email: 'admin@example.com',
      password: 'Admin123!',
      firstname: 'Admin',
      lastname: 'User',
    });

    console.log('✅ Admin créé:', adminResponse.data);

    // 2. Se connecter en tant qu'admin
    const loginResponse = await axios.post('http://localhost:1337/admin/login', {
      email: 'admin@example.com',
      password: 'Admin123!',
    });

    const adminToken = loginResponse.data.data.token;
    console.log('✅ Admin connecté, token obtenu');

    // 3. Récupérer le rôle "Authenticated"
    const rolesResponse = await axios.get('http://localhost:1337/admin/users-permissions/roles', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const authenticatedRole = rolesResponse.data.roles.find(role => role.type === 'authenticated');
    console.log('✅ Rôle authenticated trouvé:', authenticatedRole.id);

    // 4. Configurer les permissions
    const permissionsToSet = {
      'api::page.page': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::article.article': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::evenement.evenement': ['find', 'findOne', 'create', 'update', 'delete'],
      'api::site.site': ['find', 'findOne', 'create', 'update', 'delete'],
    };

    // Construire l'objet permissions
    const permissions = {};

    for (const [contentType, actions] of Object.entries(permissionsToSet)) {
      permissions[contentType] = {};
      for (const action of actions) {
        permissions[contentType][action] = {
          enabled: true,
          policy: ''
        };
      }
    }

    // 5. Mettre à jour les permissions du rôle
    const updateResponse = await axios.put(`http://localhost:1337/admin/users-permissions/roles/${authenticatedRole.id}`, {
      name: authenticatedRole.name,
      description: authenticatedRole.description,
      type: authenticatedRole.type,
      permissions: permissions
    }, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    console.log('✅ Permissions configurées avec succès!');

    // 6. Tester l'accès aux pages avec un utilisateur authentifié
    console.log('📝 Test d\'accès aux pages...');

    const testResponse = await axios.get('http://localhost:1337/api/pages', {
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNzUyNTM5MDA0LCJleHAiOjE3NTUxMzEwMDR9.u9TcvQvmdH9_RAeQ8CrZRSfajWT8W65oTHaX8RfmroE`
      }
    });

    console.log('✅ Test réussi! Pages:', testResponse.data);

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

configurePermissions();
