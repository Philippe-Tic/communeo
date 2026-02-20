import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'
import { uploadFile } from './useOfficialDocuments'

export type AssociationCategory = 'sport' | 'culture' | 'social' | 'environnement' | 'education' | 'autre'
export type AssociationStatus = 'pending' | 'published' | 'rejected'

export interface Association {
  id: number
  documentId: string
  name: string
  description?: string
  category: AssociationCategory
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  address?: string
  logo?: {
    id: number
    url: string
    alternativeText?: string
  }
  status: AssociationStatus
  submission_source: 'manual' | 'public_form'
  submitted_by_name?: string
  submitted_by_email?: string
  reviewed_at?: string
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateAssociationData {
  name: string
  category: AssociationCategory
  description?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  website?: string
  address?: string
  logo?: number
  status?: AssociationStatus
  submission_source?: 'manual' | 'public_form'
}

export interface UpdateAssociationData extends Partial<CreateAssociationData> {
  id: string
  reviewed_at?: string
}

export interface AssociationsResponse {
  data: Association[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export { uploadFile }

export const ASSOCIATIONS_QUERY_KEYS = {
  all: ['associations'] as const,
  lists: () => [...ASSOCIATIONS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...ASSOCIATIONS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...ASSOCIATIONS_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...ASSOCIATIONS_QUERY_KEYS.details(), documentId] as const,
}

export const CATEGORY_LABELS: Record<AssociationCategory, string> = {
  sport: 'Sport',
  culture: 'Culture',
  social: 'Social',
  environnement: 'Environnement',
  education: 'Éducation',
  autre: 'Autre',
}

export const CATEGORY_COLORS: Record<AssociationCategory, string> = {
  sport: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  culture: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  social: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  environnement: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  education: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  autre: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export const STATUS_CONFIG: Record<AssociationStatus, { className: string; label: string }> = {
  pending: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'En attente' },
  published: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Publiée' },
  rejected: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Rejetée' },
}

export const useAssociations = (params: {
  page?: number
  pageSize?: number
  search?: string
  category?: AssociationCategory
  status?: AssociationStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.search) queryParams.append('filters[name][$containsi]', params.search)
  if (params.category) queryParams.append('filters[category][$eq]', params.category)
  if (params.status) queryParams.append('filters[status][$eq]', params.status)
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    queryParams.append('sort', 'name:asc')
  }

  queryParams.append('populate', '*')

  return useQuery({
    queryKey: ASSOCIATIONS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<AssociationsResponse> => {
      const url = `/api/associations?${queryParams.toString()}`
      return apiClient.get<AssociationsResponse>(url)
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useAssociation = (documentId: string) => {
  return useQuery({
    queryKey: ASSOCIATIONS_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<Association> => {
      const url = `/api/associations/${documentId}?populate=*`
      const response = await apiClient.get<{ data: Association }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreateAssociation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAssociationData): Promise<Association> => {
      const response = await apiClient.post<{ data: Association }>('/api/associations', {
        data: { ...data, status: 'published', submission_source: 'manual' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSOCIATIONS_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateAssociation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAssociationData): Promise<Association> => {
      const response = await apiClient.put<{ data: Association }>(`/api/associations/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ASSOCIATIONS_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: ASSOCIATIONS_QUERY_KEYS.lists() })
    },
  })
}

export const usePendingAssociationsCount = () => {
  return useQuery({
    queryKey: [...ASSOCIATIONS_QUERY_KEYS.all, 'pending-count'] as const,
    queryFn: async (): Promise<number> => {
      const url = `/api/associations?filters[status][$eq]=pending&pagination[pageSize]=1`
      const response = await apiClient.get<AssociationsResponse>(url)
      return response.meta.pagination.total
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useDeleteAssociation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/associations/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      queryClient.removeQueries({ queryKey: ASSOCIATIONS_QUERY_KEYS.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: ASSOCIATIONS_QUERY_KEYS.lists() })
    },
  })
}
