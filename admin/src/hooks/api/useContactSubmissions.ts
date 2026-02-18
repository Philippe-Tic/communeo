import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

export interface ContactSubmission {
  id: number
  documentId: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  subject: string
  message: string
  category: 'general' | 'urbanisme' | 'etat-civil' | 'voirie' | 'associations' | 'rgpd' | 'autre'
  status: 'received' | 'in_progress' | 'resolved' | 'closed'
  reference_number: string
  acknowledgment_sent: boolean
  acknowledged_at?: string
  response?: string
  responded_at?: string
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface UpdateContactSubmissionData {
  id: string
  status?: ContactSubmission['status']
  response?: string
  responded_at?: string
}

export interface ContactSubmissionsResponse {
  data: ContactSubmission[]
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
export const CONTACT_SUBMISSIONS_QUERY_KEYS = {
  all: ['contact-submissions'] as const,
  lists: () => [...CONTACT_SUBMISSIONS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...CONTACT_SUBMISSIONS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...CONTACT_SUBMISSIONS_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...CONTACT_SUBMISSIONS_QUERY_KEYS.details(), documentId] as const,
  count: () => [...CONTACT_SUBMISSIONS_QUERY_KEYS.all, 'count'] as const,
}

export const useContactSubmissions = (params: {
  page?: number
  pageSize?: number
  search?: string
  status?: ContactSubmission['status']
  category?: ContactSubmission['category']
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.status) queryParams.append('filters[status][$eq]', params.status)
  if (params.category) queryParams.append('filters[category][$eq]', params.category)
  if (params.search) {
    // Search by name or email
    queryParams.append('filters[$or][0][last_name][$containsi]', params.search)
    queryParams.append('filters[$or][1][first_name][$containsi]', params.search)
    queryParams.append('filters[$or][2][email][$containsi]', params.search)
    queryParams.append('filters[$or][3][reference_number][$containsi]', params.search)
  }
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'desc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    queryParams.append('sort', 'createdAt:desc')
  }

  queryParams.append('populate', '*')

  return useQuery({
    queryKey: CONTACT_SUBMISSIONS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<ContactSubmissionsResponse> => {
      const url = `/api/contact-submissions?${queryParams.toString()}`
      return apiClient.get<ContactSubmissionsResponse>(url)
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useContactSubmission = (documentId: string) => {
  return useQuery({
    queryKey: CONTACT_SUBMISSIONS_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<ContactSubmission> => {
      const url = `/api/contact-submissions/${documentId}?populate=*`
      const response = await apiClient.get<{ data: ContactSubmission }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 2,
  })
}

export const useUpdateContactSubmission = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateContactSubmissionData): Promise<ContactSubmission> => {
      const response = await apiClient.put<{ data: ContactSubmission }>(`/api/contact-submissions/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(CONTACT_SUBMISSIONS_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: CONTACT_SUBMISSIONS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: CONTACT_SUBMISSIONS_QUERY_KEYS.count() })
    },
  })
}

export const useDeleteContactSubmission = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/contact-submissions/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      queryClient.removeQueries({ queryKey: CONTACT_SUBMISSIONS_QUERY_KEYS.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: CONTACT_SUBMISSIONS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: CONTACT_SUBMISSIONS_QUERY_KEYS.count() })
    },
  })
}

export const useContactSubmissionsCount = () => {
  return useQuery({
    queryKey: CONTACT_SUBMISSIONS_QUERY_KEYS.count(),
    queryFn: async (): Promise<number> => {
      const url = `/api/contact-submissions?filters[status][$eq]=received&pagination[pageSize]=1`
      const response = await apiClient.get<ContactSubmissionsResponse>(url)
      return response.meta.pagination.total
    },
    staleTime: 1000 * 60 * 2,
  })
}
