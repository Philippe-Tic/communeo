const axios = require('axios');

async function createTestUser() {
  try {
    // Créer un utilisateur de test simple
    const response = await axios.post('http://localhost:1337/api/auth/local/register', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123',
    });

    console.log('✅ Utilisateur de test créé:', response.data);

    // Récupérer le token
    const token = response.data.jwt;
    console.log('✅ Token:', token);

    // Tester l'accès aux pages
    const pagesResponse = await axios.get('http://localhost:1337/api/pages', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Pages:', pagesResponse.data);

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

createTestUser();
