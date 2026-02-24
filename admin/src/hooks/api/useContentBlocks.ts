import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

export interface ContentBlock {
  id: number
  documentId: string
  name: string
  content: string
  category: 'header' | 'footer' | 'sidebar' | 'content' | 'cta' | 'other'
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface ContentBlocksResponse {
  data: ContentBlock[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export const CONTENT_BLOCKS_QUERY_KEYS = {
  all: ['content-blocks'] as const,
  lists: () => [...CONTENT_BLOCKS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...CONTENT_BLOCKS_QUERY_KEYS.lists(), filters] as const,
}

export const useContentBlocks = (params: {
  search?: string
  category?: string
  pageSize?: number
} = {}) => {
  const queryParams = new URLSearchParams()
  if (params.search) queryParams.append('filters[name][$containsi]', params.search)
  if (params.category) queryParams.append('filters[category][$eq]', params.category)
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  queryParams.append('sort', 'name:asc')
  queryParams.append('populate', '*')

  return useQuery({
    queryKey: CONTENT_BLOCKS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<ContentBlocksResponse> => {
      const url = `/api/content-blocks?${queryParams.toString()}`
      return apiClient.get<ContentBlocksResponse>(url)
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreateContentBlock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; content: string; category: string }): Promise<ContentBlock> => {
      const response = await apiClient.post<{ data: ContentBlock }>('/api/content-blocks', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_BLOCKS_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteContentBlock = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/content-blocks/${documentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_BLOCKS_QUERY_KEYS.lists() })
    },
  })
}
