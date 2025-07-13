import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types
export interface Article {
  id: number
  title: string
  slug: string
  content: string
  excerpt?: string
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
  categories?: Array<{
    id: number
    name: string
    slug: string
  }>
  tags?: Array<{
    id: number
    name: string
    slug: string
  }>
}

export interface CreateArticleData {
  title: string
  content: string
  excerpt?: string
  status?: 'draft' | 'published'
  featured_image?: number
  categories?: number[]
  tags?: number[]
}

export interface UpdateArticleData extends Partial<CreateArticleData> {
  id: number
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
  list: (filters: Record<string, unknown>) => [...ARTICLES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...ARTICLES_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...ARTICLES_QUERY_KEYS.details(), id] as const,
}

// Hooks
export const useArticles = (params: {
  page?: number
  pageSize?: number
  status?: 'draft' | 'published' | 'archived'
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.status) queryParams.append('filters[status][$eq]', params.status)
  if (params.search) queryParams.append('filters[title][$containsi]', params.search)
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  }

  // Always populate relations
  queryParams.append('populate', 'author,site,categories,tags,featured_image')

  return useQuery({
    queryKey: ARTICLES_QUERY_KEYS.list(params),
    queryFn: async (): Promise<ArticlesResponse> => {
      const url = `/api/articles?${queryParams.toString()}`
      return apiClient.get<ArticlesResponse>(url)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useArticle = (id: number) => {
  return useQuery({
    queryKey: ARTICLES_QUERY_KEYS.detail(id),
    queryFn: async (): Promise<Article> => {
      const url = `/api/articles/${id}?populate=author,site,categories,tags,featured_image`
      const response = await apiClient.get<{ data: Article }>(url)
      return response.data
    },
    enabled: !!id,
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
      queryClient.setQueryData(ARTICLES_QUERY_KEYS.detail(data.id), data)

      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/articles/${id}`)
    },
    onSuccess: (_, id) => {
      // Remove the article from cache
      queryClient.removeQueries({ queryKey: ARTICLES_QUERY_KEYS.detail(id) })

      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}

export const usePublishArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<Article> => {
      const response = await apiClient.put<{ data: Article }>(`/api/articles/${id}`, {
        data: { status: 'published', publishedAt: new Date().toISOString() }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific article in cache
      queryClient.setQueryData(ARTICLES_QUERY_KEYS.detail(data.id), data)

      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}

export const useUnpublishArticle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<Article> => {
      const response = await apiClient.put<{ data: Article }>(`/api/articles/${id}`, {
        data: { status: 'draft', publishedAt: null }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific article in cache
      queryClient.setQueryData(ARTICLES_QUERY_KEYS.detail(data.id), data)

      // Invalidate articles list to refetch
      queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEYS.lists() })
    },
  })
}
