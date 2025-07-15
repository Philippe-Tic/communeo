const axios = require('axios');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaWF0IjoxNzUyNTM5MDA0LCJleHAiOjE3NTUxMzEwMDR9.u9TcvQvmdH9_RAeQ8CrZRSfajWT8W65oTHaX8RfmroE';

async function testMiddleware() {
  console.log('🧪 Test du middleware d\'isolation par site...\n');

  // Test 1: Accès à la liste des pages
  try {
    console.log('📝 Test 1: GET /api/pages (liste)');
    const response = await axios.get('http://localhost:1337/api/pages', {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    console.log('✅ Succès! Réponse:', JSON.stringify(response.data, null, 2));

    // Vérifier que le filtre par site est appliqué
    if (response.data.data) {
      console.log('📊 Nombre d\'éléments retournés:', response.data.data.length);
      console.log('🔍 Vérification du filtre par site...');

      // Chaque page devrait appartenir au même site
      const siteIds = response.data.data.map(page => page.site?.documentId || page.site?.id).filter(Boolean);
      const uniqueSiteIds = [...new Set(siteIds)];

      if (uniqueSiteIds.length <= 1) {
        console.log('✅ Filtre par site appliqué correctement');
      } else {
        console.log('❌ Problème: Plusieurs sites détectés:', uniqueSiteIds);
      }
    }
  } catch (error) {
    console.log('❌ Erreur Test 1:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Créer une page
  try {
    console.log('📝 Test 2: POST /api/pages (création)');
    const pageData = {
      data: {
        title: 'Page de test middleware',
        slug: 'page-test-middleware',
        content: 'Contenu de test pour le middleware',
        status: 'published',
        template: 'default',
        menu_order: 0,
        show_in_menu: true,
        is_homepage: false,
        // Ne pas spécifier de site - le middleware devrait l'ajouter automatiquement
      }
    };

    const response = await axios.post('http://localhost:1337/api/pages', pageData, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Succès! Page créée:', response.data.data.title);
    console.log('🔍 Site assigné:', response.data.data.site?.documentId || response.data.data.site?.id);

    // Stocker l'ID pour le test suivant
    global.testPageId = response.data.data.documentId || response.data.data.id;

  } catch (error) {
    console.log('❌ Erreur Test 2:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Accès à une page spécifique
  if (global.testPageId) {
    try {
      console.log('📝 Test 3: GET /api/pages/:id (page spécifique)');
      const response = await axios.get(`http://localhost:1337/api/pages/${global.testPageId}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });

      console.log('✅ Succès! Page récupérée:', response.data.data.title);
      console.log('🔍 Site de la page:', response.data.data.site?.documentId || response.data.data.site?.id);

    } catch (error) {
      console.log('❌ Erreur Test 3:', error.response?.data || error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Essayer d'accéder à une page d'un autre site (devrait échouer)
  try {
    console.log('📝 Test 4: GET /api/pages/fake-id (page inexistante)');
    const response = await axios.get('http://localhost:1337/api/pages/fake-document-id', {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    console.log('❌ Problème: Accès autorisé à une page qui ne devrait pas l\'être');

  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ Succès! Accès refusé comme attendu (404)');
    } else if (error.response?.status === 403) {
      console.log('✅ Succès! Accès refusé par le middleware (403)');
    } else {
      console.log('❌ Erreur inattendue:', error.response?.data || error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Tester les articles
  try {
    console.log('📝 Test 5: GET /api/articles (test d\'un autre content type)');
    const response = await axios.get('http://localhost:1337/api/articles', {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    console.log('✅ Succès! Articles récupérés:', response.data.data?.length || 0);

  } catch (error) {
    console.log('❌ Erreur Test 5:', error.response?.data || error.message);
  }

  console.log('\n🎉 Tests terminés!');
}

// Exécuter les tests
testMiddleware().catch(console.error);
