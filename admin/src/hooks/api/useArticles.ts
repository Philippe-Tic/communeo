import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types alignés avec le schéma backend
export interface Article {
  id: number
  documentId: string
  title: string
  slug: string
  content: string
  summary?: string
  image?: {
    id: number
    url: string
    alternativeText?: string
    caption?: string
  }
  status: 'draft' | 'published' | 'archived'
  publication_date?: string
  category: 'news' | 'event' | 'information' | 'emergency'
  author?: string
  featured: boolean
  meta_description?: string
  view_count: number
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateArticleData {
  title: string
  content: string
  summary?: string
  status?: 'draft' | 'published'
  image?: number
  category?: 'news' | 'event' | 'information' | 'emergency'
  author?: string
  featured?: boolean
  meta_description?: string
}

export interface UpdateArticleData extends Partial<CreateArticleData> {
  id: string
}

export interface ArticlesResponse {
  data: Article[]
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
export const ARTICLES_QUERY_KEYS = {
  all: ['articles'] as const,
  lists: () => [...ARTICLES_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...ARTICLES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...ARTICLES_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...ARTICLES_QUERY_KEYS.details(), documentId] as const,
}

// Hooks
export const useArticles = (params: {
  page?: number
  pageSize?: number
  status?: 'draft' | 'published' | 'archived'
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  category?: 'news' | 'event' | 'information' | 'emergency'
  featured?: boolean
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.status) queryParams.append('filters[status][$eq]', params.status)
  if (params.search) queryParams.append('filters[title][$containsi]', params.search)
  if (params.category) queryParams.append('filters[category][$eq]', params.category)
  if (params.featured !== undefined) queryParams.append('filters[featured][$eq]', params.featured.toString())
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    // Default sort by creation date
    queryParams.append('sort', 'createdAt:desc')
  }

  // Always populate relations
  queryParams.append('populate', '*')

  return useQuery({
    queryKey: ARTICLES_QUERY_KEYS.list(params),
    queryFn: async (): Promise<ArticlesResponse> => {
      const url = `/api/articles?${queryParams.toString()}`
      return apiClient.get<ArticlesResponse>(url)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useArticle = (documentId: string) => {
  return useQuery({
    queryKey: ARTICLES_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<Article> => {
      const url = `/api/articles/${documentId}`
      const response = await apiClient.get<{ data: Article }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useCreateArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateArticleData): Promise<Article> => {
      const response = await apiClient.post<{ data: Article }>('/api/articles', { data })
      return response.data
    },
    onSuccess: () => {
      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateArticleData): Promise<Article> => {
      const response = await apiClient.put<{ data: Article }>(`/api/articles/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific article in cache
      queryClient.setQueryData(ARTICLES_QUERY_KEYS.detail(data.documentId), data)

      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/articles/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      // Remove the specific article from cache
      queryClient.removeQueries({ queryKey: ARTICLES_QUERY_KEYS.detail(documentId) })

      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}

export const usePublishArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<Article> => {
      const response = await apiClient.put<{ data: Article }>(`/api/articles/${documentId}`, {
        data: { status: 'published', publication_date: new Date().toISOString() }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific article in cache
      queryClient.setQueryData(ARTICLES_QUERY_KEYS.detail(data.documentId), data)

      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}

export const useUnpublishArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<Article> => {
      const response = await apiClient.put<{ data: Article }>(`/api/articles/${documentId}`, {
        data: { status: 'draft', publication_date: null }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific article in cache
      queryClient.setQueryData(ARTICLES_QUERY_KEYS.detail(data.documentId), data)

      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}

export const useFeaturedArticles = (limit: number = 5) => {
  return useQuery({
    queryKey: [...ARTICLES_QUERY_KEYS.all, 'featured'],
    queryFn: async (): Promise<Article[]> => {
      const url = `/api/articles?filters[featured][$eq]=true&filters[status][$eq]=published&sort=publication_date:desc&pagination[pageSize]=${limit}`
      const response = await apiClient.get<ArticlesResponse>(url)
      return response.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export const useToggleArticleFeatured = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, featured }: { documentId: string, featured: boolean }): Promise<Article> => {
      const response = await apiClient.put<{ data: Article }>(`/api/articles/${documentId}`, {
        data: { featured }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific article in cache
      queryClient.setQueryData(ARTICLES_QUERY_KEYS.detail(data.documentId), data)

      // Invalidate articles list and featured articles to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: [...ARTICLES_QUERY_KEYS.all, 'featured'] })
    },
  })
}
