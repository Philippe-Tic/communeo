import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types
export interface Site {
  id: number
  name: string
  slug: string
  description?: string
  url: string
  admin_email: string
  theme?: string
  logo?: {
    id: number
    url: string
    alternativeText?: string
    caption?: string
  }
  favicon?: {
    id: number
    url: string
    alternativeText?: string
    caption?: string
  }
  social_links?: {
    facebook?: string
    twitter?: string
    instagram?: string
    youtube?: string
    linkedin?: string
  }
  contact_info?: {
    address?: string
    phone?: string
    email?: string
    hours?: string
  }
  seo_settings?: {
    meta_title?: string
    meta_description?: string
    meta_keywords?: string
    google_analytics_id?: string
    google_search_console_id?: string
  }
  navigation_menu?: Array<{
    id: number
    label: string
    url: string
    order: number
    parent?: number
    target?: '_self' | '_blank'
  }>
  footer_menu?: Array<{
    id: number
    label: string
    url: string
    order: number
    parent?: number
    target?: '_self' | '_blank'
  }>
  is_active: boolean
  maintenance_mode?: boolean
  maintenance_message?: string
  createdAt: string
  updatedAt: string
  users?: Array<{
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    municipality_role: 'mayor' | 'deputy' | 'secretary' | 'editor'
  }>
}

export interface CreateSiteData {
  name: string
  slug: string
  description?: string
  url: string
  admin_email: string
  theme?: string
  logo?: number
  favicon?: number
  social_links?: {
    facebook?: string
    twitter?: string
    instagram?: string
    youtube?: string
    linkedin?: string
  }
  contact_info?: {
    address?: string
    phone?: string
    email?: string
    hours?: string
  }
  seo_settings?: {
    meta_title?: string
    meta_description?: string
    meta_keywords?: string
    google_analytics_id?: string
    google_search_console_id?: string
  }
  is_active?: boolean
  maintenance_mode?: boolean
  maintenance_message?: string
}

export interface UpdateSiteData extends Partial<CreateSiteData> {
  id: number
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
  list: (filters: Record<string, unknown>) => [...SITES_QUERY_KEYS.lists(), filters] as const,
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

export const useSite = (id: number) => {
  return useQuery({
    queryKey: SITES_QUERY_KEYS.detail(id),
    queryFn: async (): Promise<Site> => {
      const url = `/api/sites/${id}?populate=logo,favicon,users`
      const response = await apiClient.get<{ data: Site }>(url)
      return response.data
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useCurrentSite = () => {
  return useQuery({
    queryKey: SITES_QUERY_KEYS.current(),
    queryFn: async (): Promise<Site> => {
      const url = '/api/sites/current?populate=logo,favicon,users'
      const response = await apiClient.get<{ data: Site }>(url)
      return response.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (current site changes less frequently)
  })
}

export const useCreateSite = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSiteData): Promise<Site> => {
      const response = await apiClient.post<{ data: Site }>('/api/sites', { data })
      return response.data
    },
    onSuccess: () => {
      // Invalidate sites list to refetch
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateSite = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateSiteData): Promise<Site> => {
      const response = await apiClient.put<{ data: Site }>(`/api/sites/${id}`, { data })
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

export const useDeleteSite = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/sites/${id}`)
    },
    onSuccess: (_, id) => {
      // Remove the site from cache
      queryClient.removeQueries({ queryKey: SITES_QUERY_KEYS.detail(id) })

      // Invalidate sites list to refetch
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.lists() })

      // Invalidate current site cache
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.current() })
    },
  })
}

export const useToggleSiteStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<Site> => {
      // First get the current site to know its status
      const currentSite = await apiClient.get<{ data: Site }>(`/api/sites/${id}`)
      const newStatus = !currentSite.data.is_active

      const response = await apiClient.put<{ data: Site }>(`/api/sites/${id}`, {
        data: { is_active: newStatus }
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

export const useUpdateSiteNavigation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      id: number
      navigation_menu?: Site['navigation_menu']
      footer_menu?: Site['footer_menu']
    }): Promise<Site> => {
      const response = await apiClient.put<{ data: Site }>(`/api/sites/${params.id}`, {
        data: {
          navigation_menu: params.navigation_menu,
          footer_menu: params.footer_menu
        }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific site in cache
      queryClient.setQueryData(SITES_QUERY_KEYS.detail(data.id), data)

      // Invalidate current site if it's the one being updated
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.current() })
    },
  })
}
