import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

export interface StrapiMedia {
  id: number
  documentId: string
  name: string
  url: string
  mime: string
  size: number
  ext: string
}

export interface OfficialDocument {
  id: number
  documentId: string
  title: string
  slug: string
  description?: string
  document_type: 'pv-conseil-municipal' | 'deliberation' | 'arrete' | 'plu' | 'scot' | 'carte-communale' | 'budget-primitif' | 'compte-administratif' | 'rapport-orientations-budgetaires' | 'autre'
  document_date: string
  session_date?: string
  file: StrapiMedia
  additional_files?: StrapiMedia[]
  status: 'draft' | 'published' | 'archived'
  reference_number?: string
  year: number
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateOfficialDocumentData {
  title: string
  slug: string
  description?: string
  document_type: string
  document_date: string
  session_date?: string
  file: number
  additional_files?: number[]
  status?: 'draft' | 'published' | 'archived'
  reference_number?: string
  year: number
}

export interface UpdateOfficialDocumentData extends Partial<Omit<CreateOfficialDocumentData, 'file' | 'additional_files'>> {
  id: string
  file?: number
  additional_files?: number[]
}

export interface OfficialDocumentsResponse {
  data: OfficialDocument[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// Upload helper
export const uploadFile = async (file: File): Promise<StrapiMedia> => {
  const formData = new FormData()
  formData.append('files', file)
  const response = await apiClient.post<StrapiMedia[]>('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response[0]
}

// Query keys
export const OFFICIAL_DOCUMENTS_QUERY_KEYS = {
  all: ['official-documents'] as const,
  lists: () => [...OFFICIAL_DOCUMENTS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...OFFICIAL_DOCUMENTS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...OFFICIAL_DOCUMENTS_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...OFFICIAL_DOCUMENTS_QUERY_KEYS.details(), documentId] as const,
}

// Hooks
export const useOfficialDocuments = (params: {
  page?: number
  pageSize?: number
  status?: 'draft' | 'published' | 'archived'
  search?: string
  document_type?: string
  year?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.status) queryParams.append('filters[status][$eq]', params.status)
  if (params.search) queryParams.append('filters[title][$containsi]', params.search)
  if (params.document_type) queryParams.append('filters[document_type][$eq]', params.document_type)
  if (params.year) queryParams.append('filters[year][$eq]', params.year.toString())
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    queryParams.append('sort', 'document_date:desc')
  }

  queryParams.append('populate', '*')

  return useQuery({
    queryKey: OFFICIAL_DOCUMENTS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<OfficialDocumentsResponse> => {
      const url = `/api/official-documents?${queryParams.toString()}`
      return apiClient.get<OfficialDocumentsResponse>(url)
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useOfficialDocument = (documentId: string) => {
  return useQuery({
    queryKey: OFFICIAL_DOCUMENTS_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<OfficialDocument> => {
      const url = `/api/official-documents/${documentId}?populate=*`
      const response = await apiClient.get<{ data: OfficialDocument }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreateOfficialDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateOfficialDocumentData): Promise<OfficialDocument> => {
      const response = await apiClient.post<{ data: OfficialDocument }>('/api/official-documents', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFICIAL_DOCUMENTS_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateOfficialDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateOfficialDocumentData): Promise<OfficialDocument> => {
      const response = await apiClient.put<{ data: OfficialDocument }>(`/api/official-documents/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(OFFICIAL_DOCUMENTS_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: OFFICIAL_DOCUMENTS_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteOfficialDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/official-documents/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      queryClient.removeQueries({ queryKey: OFFICIAL_DOCUMENTS_QUERY_KEYS.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: OFFICIAL_DOCUMENTS_QUERY_KEYS.lists() })
    },
  })
}

export const usePublishOfficialDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<OfficialDocument> => {
      const response = await apiClient.put<{ data: OfficialDocument }>(`/api/official-documents/${documentId}`, {
        data: { status: 'published' }
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(OFFICIAL_DOCUMENTS_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: OFFICIAL_DOCUMENTS_QUERY_KEYS.lists() })
    },
  })
}

export const useArchiveOfficialDocument = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<OfficialDocument> => {
      const response = await apiClient.put<{ data: OfficialDocument }>(`/api/official-documents/${documentId}`, {
        data: { status: 'archived' }
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(OFFICIAL_DOCUMENTS_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: OFFICIAL_DOCUMENTS_QUERY_KEYS.lists() })
    },
  })
}
