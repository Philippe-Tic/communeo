import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

import type { StrapiMedia } from './useOfficialDocuments'
export type { StrapiMedia }

export interface MediaItem {
  id: number
  documentId: string
  name: string
  alt_text?: string
  caption?: string
  folder: string
  file: StrapiMedia
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface MediaItemsResponse {
  data: MediaItem[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export interface UpdateMediaItemData {
  id: string
  name?: string
  alt_text?: string
  caption?: string
  folder?: string
}

// Query keys
export const MEDIA_QUERY_KEYS = {
  all: ['media-items'] as const,
  lists: () => [...MEDIA_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...MEDIA_QUERY_KEYS.lists(), filters] as const,
  details: () => [...MEDIA_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...MEDIA_QUERY_KEYS.details(), documentId] as const,
}

// Hooks
export const useMediaItems = (params: {
  page?: number
  pageSize?: number
  search?: string
  folder?: string
  fileType?: 'image' | 'file' | 'video'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.search) queryParams.append('filters[name][$containsi]', params.search)
  if (params.folder) queryParams.append('filters[folder][$eq]', params.folder)

  // Filter by file mime type
  if (params.fileType === 'image') {
    queryParams.append('filters[file][mime][$startsWith]', 'image/')
  } else if (params.fileType === 'video') {
    queryParams.append('filters[file][mime][$startsWith]', 'video/')
  } else if (params.fileType === 'file') {
    queryParams.append('filters[file][mime][$notStartsWith]', 'image/')
    queryParams.append('filters[file][mime][$notStartsWith]', 'video/')
  }

  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'desc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    queryParams.append('sort', 'createdAt:desc')
  }

  queryParams.append('populate', '*')

  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.list(params),
    queryFn: async (): Promise<MediaItemsResponse> => {
      const url = `/api/media-items?${queryParams.toString()}`
      return apiClient.get<MediaItemsResponse>(url)
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useMediaItem = (documentId: string) => {
  return useQuery({
    queryKey: MEDIA_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<MediaItem> => {
      const url = `/api/media-items/${documentId}?populate=*`
      const response = await apiClient.get<{ data: MediaItem }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useUploadMedia = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      file: File
      name?: string
      alt_text?: string
      caption?: string
      folder?: string
    }): Promise<MediaItem> => {
      const formData = new FormData()
      formData.append('files', params.file)
      if (params.name) formData.append('name', params.name)
      if (params.alt_text) formData.append('alt_text', params.alt_text)
      if (params.caption) formData.append('caption', params.caption)
      if (params.folder) formData.append('folder', params.folder)

      const response = await apiClient.post<{ data: MediaItem }>(
        '/api/media-items/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateMediaItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateMediaItemData): Promise<MediaItem> => {
      const response = await apiClient.put<{ data: MediaItem }>(`/api/media-items/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(MEDIA_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteMediaItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/media-items/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      queryClient.removeQueries({ queryKey: MEDIA_QUERY_KEYS.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.lists() })
    },
  })
}
