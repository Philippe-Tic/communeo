#!/usr/bin/env node

/**
 * Script utilitaire pour récupérer les documentId des sites depuis Strapi
 * Usage: node get-site-ids.js [STRAPI_URL]
 */

const STRAPI_URL = process.argv[2] || process.env.STRAPI_URL || 'http://localhost:1337';

async function getSiteIds() {
  try {
    console.log(`🔍 Récupération des sites depuis ${STRAPI_URL}...`);

    const response = await fetch(`${STRAPI_URL}/api/sites`);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const sites = data.data || [];

    if (sites.length === 0) {
      console.log('❌ Aucun site trouvé dans Strapi');
      return;
    }

    console.log('✅ Sites trouvés:');
    console.log('');

    sites.forEach((site, index) => {
      const { documentId, name, slug } = site;

      console.log(`${index + 1}. ${name} (${slug})`);
      console.log(`   📄 documentId: ${documentId}`);
      console.log(`   🌐 Variable env: SITE_DOCUMENT_ID=${documentId}`);
      console.log('');
    });

    console.log('💡 Copiez le documentId souhaité dans votre fichier .env');

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des sites:', error.message);
    console.log('');
    console.log('💡 Vérifiez que :');
    console.log('   - Strapi est bien démarré');
    console.log('   - L\'URL est correcte');
    console.log('   - Les permissions sont configurées pour l\'API Sites');
  }
}

// Exécuter le script
getSiteIds();
