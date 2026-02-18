import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types — Composants légaux Strapi
export interface MentionsLegales {
  id?: number
  siret?: string
  publication_director?: string
  publication_director_title?: string
  hebergeur_name?: string
  hebergeur_address?: string
  hebergeur_phone?: string
  credits?: string
  mentions_legales_extra?: string
}

export interface RGPD {
  id?: number
  rgpd_policy?: string
  dpo_name?: string
  dpo_email?: string
  dpo_phone?: string
}

export interface Accessibilite {
  id?: number
  accessibility_level?: 'non-conforme' | 'partiellement-conforme' | 'conforme'
  accessibility_declaration?: string
  accessibility_schema_url?: string
  accessibility_action_plan_url?: string
}

export interface InfosPratiques {
  id?: number
  opening_hours?: any
  population?: number
  contact_form_intro?: string
}

export interface Site {
  id: number
  documentId: string
  name: string
  slug: string
  theme: 'classique' | 'moderne' | 'accessible'
  colors?: any // JSON field
  logo?: {
    id: number
    url: string
    alternativeText?: string
    caption?: string
  }
  contact_mail: string
  contact_phone?: string
  address?: string
  createdAt: string
  updatedAt: string
  // Composants légaux
  mentions_legales?: MentionsLegales
  rgpd?: RGPD
  accessibilite?: Accessibilite
  infos_pratiques?: InfosPratiques
  // Relations
  pages?: any[]
  articles?: any[]
  evenements?: any[]
}

export interface CreateSiteData {
  name: string
  slug?: string
  theme?: 'classique' | 'moderne' | 'accessible'
  colors?: any
  logo?: number
  contact_mail: string
  contact_phone?: string
  address?: string
  // Composants légaux
  mentions_legales?: Partial<Omit<MentionsLegales, 'id'>>
  rgpd?: Partial<Omit<RGPD, 'id'>>
  accessibilite?: Partial<Omit<Accessibilite, 'id'>>
  infos_pratiques?: Partial<Omit<InfosPratiques, 'id'>>
}

export interface UpdateSiteData extends Partial<CreateSiteData> {
  documentId: string
}

export interface SitesResponse {
  data: Site[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// Query keys
export const SITES_QUERY_KEYS = {
  all: ['sites'] as const,
  lists: () => [...SITES_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...SITES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...SITES_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...SITES_QUERY_KEYS.details(), id] as const,
  current: () => [...SITES_QUERY_KEYS.all, 'current'] as const,
}

// Hooks
export const useSites = (params: {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  is_active?: boolean
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.search) queryParams.append('filters[name][$containsi]', params.search)
  if (params.is_active !== undefined) queryParams.append('filters[is_active][$eq]', params.is_active.toString())
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    // Default sort by name
    queryParams.append('sort', 'name:asc')
  }

  // Always populate relations
  queryParams.append('populate', '*')

  return useQuery({
    queryKey: SITES_QUERY_KEYS.list(params),
    queryFn: async (): Promise<SitesResponse> => {
      const url = `/api/sites?${queryParams.toString()}`
      return apiClient.get<SitesResponse>(url)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useSite = (documentId: string) => {
  return useQuery({
    queryKey: SITES_QUERY_KEYS.current(),
    queryFn: async (): Promise<Site> => {
      const url = `/api/sites/${documentId}?populate=*`
      const response = await apiClient.get<{ data: Site }>(url)
      return response.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (current site changes less frequently)
  })
}

export const useUpdateSite = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, ...data }: UpdateSiteData): Promise<Site> => {
      const response = await apiClient.put<{ data: Site }>(`/api/sites/${documentId}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific site in cache
      queryClient.setQueryData(SITES_QUERY_KEYS.detail(data.id), data)

      // Invalidate sites list to refetch
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.lists() })

      // Invalidate current site if it's the one being updated
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.current() })
    },
  })
}

export const useToggleMaintenanceMode = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: number; maintenance_mode: boolean; maintenance_message?: string }): Promise<Site> => {
      const response = await apiClient.put<{ data: Site }>(`/api/sites/${params.id}`, {
        data: {
          maintenance_mode: params.maintenance_mode,
          maintenance_message: params.maintenance_message || null
        }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific site in cache
      queryClient.setQueryData(SITES_QUERY_KEYS.detail(data.id), data)

      // Invalidate sites list to refetch
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.lists() })

      // Invalidate current site if it's the one being updated
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.current() })
    },
  })
}
