import apiClient from './apiClient'

// Types
export interface Deployment {
  id: number
  documentId: string
  deployment_id: string
  status: 'building' | 'ready' | 'error'
  createdAt: string
  triggered_by: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
  build_time?: number
  error_message?: string
  deployment_url?: string
  triggered_at: string
  completed_at?: string
  site: {
    id: number
    name: string
    slug: string
    live_url?: string
  }
}

export interface DeploymentResponse {
  success: boolean
  message: string
  status: string
  site: {
    id: string
    name: string
    slug: string
  }
}

export interface DeploymentsListResponse {
  data: Deployment[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface DeploymentStatusResponse {
  data: Deployment
}

/**
 * Service de déploiement - Interface avec l'API backend
 */
export const deploymentService = {
  /**
   * Déclenche un nouveau déploiement
   */
  async triggerDeploy(): Promise<DeploymentResponse> {
    return apiClient.post<DeploymentResponse>('/api/deployment/trigger')
  },

  /**
   * Récupère l'historique des déploiements
   */
  async getDeployments(params: {
    page?: number
    pageSize?: number
  } = {}): Promise<DeploymentsListResponse> {
    const queryParams = new URLSearchParams()

    if (params.page) queryParams.append('page', params.page.toString())
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString())

    const url = `/api/deployment/status${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<DeploymentsListResponse>(url)
  },

  /**
   * Vérifie le statut d'un déploiement spécifique
   */
  async checkDeploymentStatus(deploymentId: string): Promise<DeploymentStatusResponse> {
    return apiClient.get<DeploymentStatusResponse>(`/api/deployment/check/${deploymentId}`)
  }
}

export default deploymentService
