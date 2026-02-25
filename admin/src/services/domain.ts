import apiClient from './apiClient'

// Types
export interface DnsInstruction {
  type: 'A' | 'CNAME'
  name: string
  displayName: string
  value: string
  purpose: string
  description: string
}

export interface DomainConfigResponse {
  success: boolean
  domain: string
  domainType: 'apex' | 'subdomain'
  netlifyUrl: string
  dnsInstructions: {
    isApex: boolean
    baseDomain: string
    records: DnsInstruction[]
  }
  message: string
}

export interface VerificationResponse {
  success: boolean
  url?: string
  message: string
  sslProvisioning?: boolean
  error?: string
  hint?: string
}

export interface RemovalResponse {
  success: boolean
  defaultUrl?: string
  message?: string
  error?: string
}

export interface DomainStatus {
  hasCustomDomain: boolean
  customDomain: string | null
  domainStatus: 'pending' | 'verified' | 'error'
  domainType: 'apex' | 'subdomain' | null
  netlifyUrl: string | null
  dnsInstructions: {
    isApex: boolean
    baseDomain?: string
    records: DnsInstruction[]
  } | null
  liveUrl: string | null
  sslEnabled: boolean
  sslStatus: any
  domainConfiguredAt: string | null
}

export interface DomainDiagnostic {
  domain: string
  dns: {
    hasARecord: boolean
    hasAAAARecord: boolean
    hasCNAME: boolean
    hasTXT: boolean
    records: {
      a: string[]
      aaaa: string[]
      cname: string[]
      txt: string[]
    }
  }
}

/**
 * Service de gestion des domaines - Interface avec l'API backend
 */
export const domainService = {
  /**
   * Configure un domaine personnalisé
   */
  async configureDomain(customDomain: string): Promise<DomainConfigResponse> {
    return apiClient.post<DomainConfigResponse>('/api/domain/configure', {
      customDomain
    })
  },

  /**
   * Vérifie et active un domaine personnalisé
   */
  async verifyDomain(): Promise<VerificationResponse> {
    return apiClient.post<VerificationResponse>('/api/domain/verify')
  },

  /**
   * Supprime un domaine personnalisé
   */
  async removeDomain(): Promise<RemovalResponse> {
    return apiClient.delete<RemovalResponse>('/api/domain/remove')
  },

  /**
   * Récupère le statut du domaine
   */
  async getDomainStatus(): Promise<DomainStatus> {
    return apiClient.get<DomainStatus>('/api/domain/status')
  },

  /**
   * Effectue un diagnostic DNS d'un domaine
   */
  async diagnoseDomain(domain: string): Promise<DomainDiagnostic> {
    return apiClient.get<DomainDiagnostic>(`/api/domain/diagnostic/${domain}`)
  }
}

export default domainService
