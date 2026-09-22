/**
 * Netlify Service - Intégration API Netlify
 */

import fetch from 'node-fetch';


interface NetlifySite {
  id: string;
  name: string;
  custom_domain?: string;
  url: string;
  admin_url: string;
  deploy_url?: string;
}

interface NetlifyDeployment {
  id: string;
  state: string;
  url: string;
  deploy_url: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
}

interface NetlifyDomain {
  hostname: string;
  ssl_url?: string;
  ssl_state?: string;
  dns_zone_name?: string;
}

class NetlifyService {
  private token: string;
  private baseUrl: string;

  constructor() {
    this.token = process.env.NETLIFY_TOKEN || '';
    this.baseUrl = 'https://api.netlify.com/api/v1';

    if (!this.token) {
      throw new Error('NETLIFY_TOKEN environment variable is required');
    }
  }

  /**
   * Effectue une requête HTTP vers l'API Netlify
   */
  async apiRequest(endpoint: string, options: any = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Netlify API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  /**
   * Liste tous les sites de l'utilisateur sur Netlify
   */
  async listSites(): Promise<NetlifySite[]> {
    return this.apiRequest('/sites');
  }

  /**
   * Trouve un site par nom ou le crée s'il n'existe pas
   */
  async findOrCreateSite(siteName: string, siteSlug: string): Promise<NetlifySite> {
    // Utiliser un nom déterministe (sans timestamp)
    const envPrefix = process.env.NODE_ENV === 'production' ? '' : 'dev-';
    const siteDomainName = `${envPrefix}${siteSlug}-mairie`;

    console.log(`🔍 [NETLIFY] Looking for existing site: ${siteDomainName}`);

    try {
      // 1. Chercher un site existant avec ce nom
      const sites = await this.listSites();
      const existingSite = sites.find(site => site.name === siteDomainName);

      if (existingSite) {
        console.log(`✅ [NETLIFY] Found existing site: ${existingSite.id} (${existingSite.name})`);
        return existingSite;
      }

      // 2. Aucun site trouvé, créer un nouveau
      console.log(`🆕 [NETLIFY] Creating new site: ${siteDomainName}`);
      return await this.createSiteWithName(siteName, siteDomainName);

    } catch (error: any) {
      console.error(`❌ [NETLIFY] Error finding/creating site: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crée un nouveau site sur Netlify avec un nom spécifique
   */
  async createSiteWithName(siteName: string, siteDomainName: string): Promise<NetlifySite> {
    console.log(`🌐 [NETLIFY] Creating site: ${siteName} with name: ${siteDomainName}`);

    const siteData = {
      name: siteDomainName,
      custom_domain: null,
      build_settings: {
        cmd: '',
        dir: '.', // Publier depuis la racine du ZIP
        env: {}
      }
    };

    const site = await this.apiRequest('/sites', {
      method: 'POST',
      body: JSON.stringify(siteData)
    });

    console.log(`✅ [NETLIFY] Site created successfully: ${site.id} (${site.name})`);
    return site;
  }

  /**
   * Met à jour les paramètres d'un site existant
   */
  async updateSiteSettings(siteId: string): Promise<NetlifySite> {
    console.log(`🔧 [NETLIFY] Updating site settings: ${siteId}`);

    const settings = {
      build_settings: {
        cmd: '',
        dir: '.', // Publier depuis la racine du ZIP
        env: {}
      }
    };

    const site = await this.apiRequest(`/sites/${siteId}`, {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });

    console.log(`✅ [NETLIFY] Site settings updated: ${site.id}`);
    return site;
  }

  /**
   * Crée un nouveau site sur Netlify (ancienne méthode - gardée pour compatibilité)
   */
  async createSite(siteName: string, siteSlug: string): Promise<NetlifySite> {
    return this.findOrCreateSite(siteName, siteSlug);
  }

    /**
   * Déploie un site à partir d'un fichier ZIP
   */
  async deploySite(netlifyId: string, zipBuffer: Buffer): Promise<NetlifyDeployment> {
    console.log(`⬆️ [NETLIFY] Starting deployment to site: ${netlifyId}`);
    console.log(`📦 [NETLIFY] ZIP size: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // L'API Netlify attend le ZIP en binaire brut, pas du FormData
    const response = await fetch(`${this.baseUrl}/sites/${netlifyId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/zip'
      },
      body: zipBuffer
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ [NETLIFY] Deploy failed ${response.status}: ${error}`);
      throw new Error(`Netlify deploy error ${response.status}: ${error}`);
    }

    const deployment = await response.json();
    console.log(`🚀 [NETLIFY] Deployment initiated: ${deployment.id}`);
    console.log(`🔗 [NETLIFY] Deploy URL: ${deployment.deploy_url}`);

    // Attendre que le déploiement soit prêt et l'activer automatiquement
    await this.waitAndActivateDeployment(netlifyId, deployment.id);

    return deployment;
  }

  /**
   * Attend que le déploiement soit prêt et l'active en production
   */
  async waitAndActivateDeployment(siteId: string, deploymentId: string): Promise<void> {
    console.log(`⏳ [NETLIFY] Waiting for deployment to be ready: ${deploymentId}`);

    let attempts = 0;
    const maxAttempts = 30; // 30 secondes max

    while (attempts < maxAttempts) {
      try {
        const deployment = await this.apiRequest(`/deploys/${deploymentId}`);

        if (deployment.state === 'ready') {
          console.log(`✅ [NETLIFY] Deployment ready, activating in production...`);

          // Activer le déploiement en production
          await this.apiRequest(`/sites/${siteId}/deploys/${deploymentId}/restore`, {
            method: 'POST'
          });

          console.log(`🎉 [NETLIFY] Deployment activated in production!`);
          return;
        } else if (deployment.state === 'error') {
          throw new Error(`Deployment failed: ${deployment.error_message}`);
        }

        console.log(`⏳ [NETLIFY] Deployment state: ${deployment.state}, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
        attempts++;

      } catch (error: any) {
        console.warn(`⚠️ [NETLIFY] Error checking deployment status: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    console.warn(`⚠️ [NETLIFY] Timeout waiting for deployment, but upload was successful`);
  }

  /**
   * Vérifie le statut d'un déploiement
   */
  async getDeploymentStatus(deploymentId: string): Promise<NetlifyDeployment> {
    return this.apiRequest(`/deploys/${deploymentId}`);
  }

  /**
   * Ajoute un domaine personnalisé à un site Netlify
   */
  async addDomainToNetlify(netlifyId: string, domain: string): Promise<NetlifyDomain> {
    const body = { custom_domain: domain };

    strapi.log.info(`[DOMAIN] PATCH /sites/${netlifyId} body: ${JSON.stringify(body)}`);

    const site = await this.apiRequest(`/sites/${netlifyId}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });

    strapi.log.info(`[DOMAIN] Netlify response custom_domain: ${site.custom_domain}`);

    // Détecter le rejet silencieux : Netlify retourne 200 OK mais custom_domain reste null
    if (!site.custom_domain || site.custom_domain !== domain) {
      throw new Error(
        `Netlify a rejeté le domaine ${domain} (réponse: custom_domain=${site.custom_domain}). ` +
        `Le domaine est peut-être déjà associé à un autre compte Netlify.`
      );
    }

    return { hostname: site.custom_domain };
  }

  /**
   * Supprime un domaine personnalisé d'un site Netlify
   */
  async removeDomainFromNetlify(netlifyId: string, domain: string): Promise<void> {
    strapi.log.info(`Removing domain ${domain} from Netlify site ${netlifyId}`);

    await this.apiRequest(`/sites/${netlifyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ custom_domain: null })
    });
  }

  /**
   * Ajoute un alias de domaine (ex: www variant) à un site Netlify
   */
  async addDomainAlias(netlifyId: string, alias: string): Promise<void> {
    strapi.log.info(`Adding domain alias ${alias} to Netlify site ${netlifyId}`);

    const site = await this.getSite(netlifyId);
    const currentAliases: string[] = (site as any).domain_aliases || [];

    if (!currentAliases.includes(alias)) {
      await this.apiRequest(`/sites/${netlifyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ domain_aliases: [...currentAliases, alias] })
      });
    }
  }

  /**
   * Supprime un alias de domaine d'un site Netlify
   */
  async removeDomainAlias(netlifyId: string, alias: string): Promise<void> {
    strapi.log.info(`Removing domain alias ${alias} from Netlify site ${netlifyId}`);

    const site = await this.getSite(netlifyId);
    const currentAliases: string[] = (site as any).domain_aliases || [];
    const filtered = currentAliases.filter(a => a !== alias);

    await this.apiRequest(`/sites/${netlifyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ domain_aliases: filtered })
    });
  }

  /**
   * Récupère le statut SSL d'un domaine
   */
  async getSSLStatus(netlifyId: string, domain: string): Promise<any> {
    try {
      return await this.apiRequest(`/sites/${netlifyId}/ssl`);
    } catch (error: any) {
      strapi.log.warn(`Could not get SSL status for ${domain}: ${error.message}`);
      return null;
    }
  }

  /**
   * Provisionne un certificat SSL pour un site
   */
  async provisionSSL(netlifyId: string): Promise<any> {
    strapi.log.info(`Provisioning SSL for site ${netlifyId}`);

    return this.apiRequest(`/sites/${netlifyId}/ssl`, {
      method: 'POST'
    });
  }

  /**
   * Récupère les informations d'un site Netlify
   */
  async getSite(netlifyId: string): Promise<NetlifySite> {
    return this.apiRequest(`/sites/${netlifyId}`);
  }

  /**
   * Met à jour la configuration d'un site Netlify
   */
  async updateSite(netlifyId: string, config: any): Promise<NetlifySite> {
    return this.apiRequest(`/sites/${netlifyId}`, {
      method: 'PATCH',
      body: JSON.stringify(config)
    });
  }

  /**
   * Supprime un site Netlify
   */
  async deleteSite(netlifyId: string): Promise<void> {
    strapi.log.info(`Deleting Netlify site: ${netlifyId}`);

    await this.apiRequest(`/sites/${netlifyId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Liste les déploiements d'un site
   */
  async listDeployments(netlifyId: string, page = 1, perPage = 20): Promise<NetlifyDeployment[]> {
    return this.apiRequest(`/sites/${netlifyId}/deploys?page=${page}&per_page=${perPage}`);
  }
}

// Export singleton instance
export default new NetlifyService();
