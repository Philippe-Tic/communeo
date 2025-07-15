import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

/**
 * Hook usePages - Récupère les pages avec filtres et pagination
 *
 * Exemples d'utilisation :
 *
 * // Récupérer toutes les pages d'un site
 * const { data: pages } = usePages({ siteId: 1 })
 *
 * // Récupérer les pages publiées d'un site avec recherche
 * const { data: pages } = usePages({
 *   siteId: 1,
 *   status: 'published',
 *   search: 'accueil'
 * })
 *
 * // Récupérer les pages racines (sans parent) d'un site
 * const { data: rootPages } = usePages({
 *   siteId: 1,
 *   parent: null
 * })
 *
 * // Récupérer les enfants d'une page spécifique
 * const { data: childPages } = usePages({
 *   siteId: 1,
 *   parent: 5
 * })
 *
 * // Pagination avec tri personnalisé
 * const { data: pages } = usePages({
 *   siteId: 1,
 *   page: 1,
 *   pageSize: 10,
 *   sortBy: 'title',
 *   sortOrder: 'desc'
 * })
 */

// Types
export interface Page {
  id: number
  title: string
  slug: string
  content: string
  meta_description?: string
  featured_image?: {
    id: number
    url: string
    alternativeText?: string
    caption?: string
  }
  status: 'draft' | 'published' | 'archived'
  publishedAt?: string
  createdAt: string
  updatedAt: string
  author: {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
  }
  site: {
    id: number
    name: string
    slug: string
  }
  parent_page?: {
    id: number
    title: string
    slug: string
  }
  child_pages?: Array<{
    id: number
    title: string
    slug: string
  }>
  menu_order?: number
  show_in_menu?: boolean
  is_homepage?: boolean
  seo_keywords?: string
  template?: 'default' | 'homepage' | 'contact' | 'about' | 'services'
}

export interface CreatePageData {
  title: string
  content: string
  meta_description?: string
  status?: 'draft' | 'published' | 'archived'
  featured_image?: number
  parent_page?: number
  menu_order?: number
  show_in_menu?: boolean
  is_homepage?: boolean
  seo_keywords?: string
  template?: 'default' | 'homepage' | 'contact' | 'about' | 'services'
  site: number // Required field
}

export interface UpdatePageData extends Partial<CreatePageData> {
  id: number
}

export interface PagesResponse {
  data: Page[]
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
export const PAGES_QUERY_KEYS = {
  all: ['pages'] as const,
  lists: () => [...PAGES_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...PAGES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PAGES_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...PAGES_QUERY_KEYS.details(), id] as const,
  hierarchy: () => [...PAGES_QUERY_KEYS.all, 'hierarchy'] as const,
}

// Hooks
export const usePages = (params: {
  siteId?: number
  page?: number
  pageSize?: number
  status?: 'draft' | 'published' | 'archived'
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  parent?: number | null
} = {}) => {
  const queryParams = new URLSearchParams()

  // Pagination
  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())

  // Filters
  if (params.siteId) queryParams.append('filters[site][id][$eq]', params.siteId.toString())
  if (params.status) queryParams.append('filters[status][$eq]', params.status)
  if (params.search) queryParams.append('filters[title][$containsi]', params.search)

  // Parent page filter
  if (params.parent !== undefined) {
    if (params.parent === null) {
      queryParams.append('filters[parent_page][$null]', 'true')
    } else {
      queryParams.append('filters[parent_page][id][$eq]', params.parent.toString())
    }
  }

  // Sorting
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    // Default sort by menu_order
    queryParams.append('sort', 'menu_order:asc')
  }

  // Always populate relations
  // queryParams.append('populate', 'author,site,parent_page,child_pages,featured_image')

  return useQuery({
    queryKey: PAGES_QUERY_KEYS.list(params),
    queryFn: async (): Promise<PagesResponse> => {
      // const url = `/api/pages?${queryParams.toString()}`
      const url = `/api/pages`
      return apiClient.get<PagesResponse>(url)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const usePage = (id: number) => {
  return useQuery({
    queryKey: PAGES_QUERY_KEYS.detail(id),
    queryFn: async (): Promise<Page> => {
      const url = `/api/pages/${id}?populate=author,site,parent_page,child_pages,featured_image`
      const response = await apiClient.get<{ data: Page }>(url)
      return response.data
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const usePagesHierarchy = (siteId?: number) => {
  return useQuery({
    queryKey: [...PAGES_QUERY_KEYS.hierarchy(), { siteId }],
    queryFn: async (): Promise<Page[]> => {
      const queryParams = new URLSearchParams()
      if (siteId) queryParams.append('filters[site][id][$eq]', siteId.toString())
      queryParams.append('populate', 'parent_page,child_pages')
      queryParams.append('sort', 'menu_order:asc')

      const url = `/api/pages?${queryParams.toString()}`
      const response = await apiClient.get<PagesResponse>(url)
      return response.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (hierarchy changes less frequently)
  })
}

export const useCreatePage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePageData): Promise<Page> => {
      const response = await apiClient.post<{ data: Page }>('/api/pages', { data })
      return response.data
    },
    onSuccess: () => {
      // Invalidate pages list and hierarchy to refetch
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.hierarchy() })
    },
  })
}

export const useUpdatePage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePageData): Promise<Page> => {
      const response = await apiClient.put<{ data: Page }>(`/api/pages/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific page in cache
      queryClient.setQueryData(PAGES_QUERY_KEYS.detail(data.id), data)

      // Invalidate pages list and hierarchy to refetch
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.hierarchy() })
    },
  })
}

export const useDeletePage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/pages/${id}`)
    },
    onSuccess: (_, id) => {
      // Remove the page from cache
      queryClient.removeQueries({ queryKey: PAGES_QUERY_KEYS.detail(id) })

      // Invalidate pages list and hierarchy to refetch
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.hierarchy() })
    },
  })
}

export const usePublishPage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<Page> => {
      const response = await apiClient.put<{ data: Page }>(`/api/pages/${id}`, {
        data: { status: 'published', publishedAt: new Date().toISOString() }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific page in cache
      queryClient.setQueryData(PAGES_QUERY_KEYS.detail(data.id), data)

      // Invalidate pages list to refetch
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.lists() })
    },
  })
}

export const useUnpublishPage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<Page> => {
      const response = await apiClient.put<{ data: Page }>(`/api/pages/${id}`, {
        data: { status: 'draft', publishedAt: null }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific page in cache
      queryClient.setQueryData(PAGES_QUERY_KEYS.detail(data.id), data)

      // Invalidate pages list to refetch
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.lists() })
    },
  })
}

export const useSetHomepage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<Page> => {
      const response = await apiClient.put<{ data: Page }>(`/api/pages/${id}`, {
        data: { is_homepage: true }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific page in cache
      queryClient.setQueryData(PAGES_QUERY_KEYS.detail(data.id), data)

      // Invalidate pages list to refetch (other pages will have is_homepage: false)
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.lists() })
    },
  })
}

export const useReorderPages = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pages: Array<{ id: number; menu_order: number }>): Promise<void> => {
      // Update each page's menu_order
      await Promise.all(
        pages.map(({ id, menu_order }) =>
          apiClient.put(`/api/pages/${id}`, { data: { menu_order } })
        )
      )
    },
    onSuccess: () => {
      // Invalidate pages list and hierarchy to refetch
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.hierarchy() })
    },
  })
}
