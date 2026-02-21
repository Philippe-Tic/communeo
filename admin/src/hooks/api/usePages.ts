import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types
export interface Page {
  id: number
  documentId: string,
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
    documentId: string
    title: string
    slug: string
  }
  child_pages?: Array<{
    id: number
    documentId: string
    title: string
    slug: string
  }>
  menu_order?: number
  show_in_menu?: boolean
  seo_keywords?: string
  template?: 'default' | 'about' | 'services'
}

export interface CreatePageData {
  title: string
  content: string
  meta_description?: string
  status?: 'draft' | 'published' | 'archived'
  featured_image?: number
  parent_page?: string | null
  menu_order?: number
  show_in_menu?: boolean
  seo_keywords?: string
  template?: 'default' | 'about' | 'services'
  site?: string
}

export interface UpdatePageData extends Partial<CreatePageData> {
  id: string
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

// parent_page and child_pages are injected by the backend controller (self-referencing relations)
const PAGE_POPULATE_PARAMS = [
  'populate[site][fields][0]=id',
  'populate[site][fields][1]=name',
  'populate[site][fields][2]=slug',
  'populate[featured_image][fields][0]=url',
  'populate[featured_image][fields][1]=alternativeText',
].join('&')

// Query keys
export const PAGES_QUERY_KEYS = {
  all: ['pages'] as const,
  lists: () => [...PAGES_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...PAGES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...PAGES_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PAGES_QUERY_KEYS.details(), id] as const,
  hierarchy: () => [...PAGES_QUERY_KEYS.all, 'hierarchy'] as const,
}

// Hooks
export const usePages = (params: {
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
  if (params.status) queryParams.append('filters[status][$eq]', params.status)
  if (params.search) queryParams.append('filters[title][$containsi]', params.search)

  // Parent page filter
  if (params.parent !== undefined) {
    if (params.parent === null) {
      queryParams.append('filters[parent_page][$null]', 'true')
    } else {
      queryParams.append('filters[parent_page][documentId][$eq]', params.parent.toString())
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

  return useQuery({
    queryKey: PAGES_QUERY_KEYS.list(params),
    queryFn: async (): Promise<PagesResponse> => {
      const url = `/api/pages?${queryParams.toString()}&${PAGE_POPULATE_PARAMS}`
      return apiClient.get<PagesResponse>(url)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const usePage = (id: string) => {
  return useQuery({
    queryKey: PAGES_QUERY_KEYS.detail(id),
    queryFn: async (): Promise<Page> => {
      const url = `/api/pages/${id}?${PAGE_POPULATE_PARAMS}`
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
      if (siteId) queryParams.append('filters[site][documentId][$eq]', siteId.toString())
      queryParams.append('sort', 'menu_order:asc')

      const url = `/api/pages?${queryParams.toString()}&${PAGE_POPULATE_PARAMS}`
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
      queryClient.setQueryData(PAGES_QUERY_KEYS.detail(data.documentId), data)

      // Invalidate pages list and hierarchy to refetch
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: PAGES_QUERY_KEYS.hierarchy() })
    },
  })
}

export const useDeletePage = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiClient.delete(`/api/pages/${id}`)
    },
    onSuccess: () => {
      // Remove the page from cache - need to find documentId first
      queryClient.removeQueries({ queryKey: PAGES_QUERY_KEYS.details() })

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
      queryClient.setQueryData(PAGES_QUERY_KEYS.detail(data.documentId), data)

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
      queryClient.setQueryData(PAGES_QUERY_KEYS.detail(data.documentId), data)

      // Invalidate pages list to refetch
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
