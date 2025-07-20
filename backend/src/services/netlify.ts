/**
 * Netlify Service - Intégration API Netlify
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

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
   * Crée un nouveau site sur Netlify
   */
  async createSite(siteName: string, siteSlug: string): Promise<NetlifySite> {
    strapi.log.info(`Creating Netlify site: ${siteName} (${siteSlug})`);

    const siteData = {
      name: `${siteSlug}-mairie`,
      custom_domain: null,
      build_settings: {
        cmd: 'npm run build',
        dir: 'dist',
        env: {}
      }
    };

    const site = await this.apiRequest('/sites', {
      method: 'POST',
      body: JSON.stringify(siteData)
    });

    strapi.log.info(`Netlify site created: ${site.id}`);
    return site;
  }

  /**
   * Déploie un site à partir d'un fichier ZIP
   */
  async deploySite(netlifyId: string, zipBuffer: Buffer): Promise<NetlifyDeployment> {
    strapi.log.info(`Deploying site to Netlify: ${netlifyId}`);

    const formData = new FormData();
    formData.append('file', zipBuffer, {
      filename: 'deploy.zip',
      contentType: 'application/zip'
    });

    const response = await fetch(`${this.baseUrl}/sites/${netlifyId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Netlify deploy error ${response.status}: ${error}`);
    }

    const deployment = await response.json();
    strapi.log.info(`Deployment started: ${deployment.id}`);
    return deployment;
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
    strapi.log.info(`Adding domain ${domain} to Netlify site ${netlifyId}`);

    return this.apiRequest(`/sites/${netlifyId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ domain })
    });
  }

  /**
   * Supprime un domaine personnalisé d'un site Netlify
   */
  async removeDomainFromNetlify(netlifyId: string, domain: string): Promise<void> {
    strapi.log.info(`Removing domain ${domain} from Netlify site ${netlifyId}`);

    await this.apiRequest(`/sites/${netlifyId}/domains/${domain}`, {
      method: 'DELETE'
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
