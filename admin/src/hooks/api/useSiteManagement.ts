import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

export interface SiteManagement {
  id: number
  documentId: string
  name: string
  slug: string
  contact_mail?: string
  contact_phone?: string
  address?: string
  netlify_site_id?: string
  theme?: string
  createdAt: string
  updatedAt: string
  logo?: any
  _stats?: {
    pages: number
    articles: number
    users: number
    events?: number
    lastDeployment?: any
  }
  _users?: any[]
  _deployments?: any[]
}

export interface SiteManagementStats {
  sites: number
  users: number
  recentDeployments: number
}

export interface CreateSiteData {
  name: string
  slug: string
  admin_email?: string
  admin_first_name?: string
  admin_last_name?: string
  contact_phone?: string
  address?: string
}

export interface UpdateSiteData {
  documentId: string
  name?: string
  slug?: string
  contact_mail?: string
  contact_phone?: string
  address?: string
}

export const SITE_MANAGEMENT_KEYS = {
  all: ['site-management'] as const,
  lists: () => [...SITE_MANAGEMENT_KEYS.all, 'list'] as const,
  details: () => [...SITE_MANAGEMENT_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...SITE_MANAGEMENT_KEYS.details(), id] as const,
  stats: () => [...SITE_MANAGEMENT_KEYS.all, 'stats'] as const,
}

export const useSiteManagementList = () => {
  return useQuery({
    queryKey: SITE_MANAGEMENT_KEYS.lists(),
    queryFn: async (): Promise<SiteManagement[]> => {
      const response = await apiClient.get<{ data: SiteManagement[] }>('/api/site-management')
      return response.data
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useSiteManagementDetail = (documentId: string) => {
  return useQuery({
    queryKey: SITE_MANAGEMENT_KEYS.detail(documentId),
    queryFn: async (): Promise<SiteManagement> => {
      const response = await apiClient.get<{ data: SiteManagement }>(`/api/site-management/${documentId}`)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 2,
  })
}

export const useSiteManagementStats = () => {
  return useQuery({
    queryKey: SITE_MANAGEMENT_KEYS.stats(),
    queryFn: async (): Promise<SiteManagementStats> => {
      const response = await apiClient.get<{ data: SiteManagementStats }>('/api/site-management/stats')
      return response.data
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useCreateSiteManagement = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSiteData): Promise<SiteManagement> => {
      const response = await apiClient.post<{ data: SiteManagement }>('/api/site-management', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SITE_MANAGEMENT_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: SITE_MANAGEMENT_KEYS.stats() })
    },
  })
}

export const useUpdateSiteManagement = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, ...data }: UpdateSiteData): Promise<SiteManagement> => {
      const response = await apiClient.put<{ data: SiteManagement }>(`/api/site-management/${documentId}`, { data })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SITE_MANAGEMENT_KEYS.detail(variables.documentId) })
      queryClient.invalidateQueries({ queryKey: SITE_MANAGEMENT_KEYS.lists() })
    },
  })
}

export const useDeleteSiteManagement = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/site-management/${documentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SITE_MANAGEMENT_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: SITE_MANAGEMENT_KEYS.stats() })
    },
  })
}
