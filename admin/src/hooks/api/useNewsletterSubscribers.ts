import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

export interface NewsletterSubscriber {
  id: number
  documentId: string
  email: string
  first_name?: string
  last_name?: string
  subscribed_at: string
  active: boolean
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface NewsletterSubscribersResponse {
  data: NewsletterSubscriber[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface NewsletterSubscriberStats {
  total: number
  active: number
  thisMonth: number
}

export const NEWSLETTER_SUBSCRIBERS_QUERY_KEYS = {
  all: ['newsletter-subscribers'] as const,
  lists: () => [...NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.lists(), filters] as const,
  stats: () => [...NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.all, 'stats'] as const,
}

export const useNewsletterSubscribers = (params: {
  page?: number
  pageSize?: number
  search?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.search) queryParams.append('filters[email][$containsi]', params.search)
  if (params.active !== undefined) queryParams.append('filters[active][$eq]', params.active.toString())
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'desc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    queryParams.append('sort', 'subscribed_at:desc')
  }

  queryParams.append('populate', '*')

  return useQuery({
    queryKey: NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<NewsletterSubscribersResponse> => {
      const url = `/api/newsletter-subscribers?${queryParams.toString()}`
      return apiClient.get<NewsletterSubscribersResponse>(url)
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useNewsletterSubscriberStats = () => {
  return useQuery({
    queryKey: NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.stats(),
    queryFn: async (): Promise<NewsletterSubscriberStats> => {
      const response = await apiClient.get<{ data: NewsletterSubscriberStats }>('/api/newsletter-subscribers/stats')
      return response.data
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useUpdateNewsletterSubscriber = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; active: boolean }): Promise<NewsletterSubscriber> => {
      const response = await apiClient.put<{ data: NewsletterSubscriber }>(`/api/newsletter-subscribers/${id}`, { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.stats() })
    },
  })
}

export const useDeleteNewsletterSubscriber = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/newsletter-subscribers/${documentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: NEWSLETTER_SUBSCRIBERS_QUERY_KEYS.stats() })
    },
  })
}
