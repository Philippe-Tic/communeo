import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

export type AlerteSeverity = 'info' | 'warning' | 'critical'
export type AlerteType = 'travaux' | 'coupure-eau' | 'coupure-electricite' | 'deviation' | 'intemperie' | 'autre'

export interface Alerte {
  id: number
  documentId: string
  title: string
  message: string
  severity: AlerteSeverity
  active: boolean
  display_from?: string
  display_until?: string
  link_url?: string
  link_label?: string
  alert_type?: AlerteType
  location?: string
  start_date?: string
  end_date?: string
  affected_area?: string
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateAlerteData {
  title: string
  message: string
  severity: AlerteSeverity
  active?: boolean
  display_from?: string
  display_until?: string
  link_url?: string
  link_label?: string
  alert_type?: AlerteType
  location?: string
  start_date?: string
  end_date?: string
  affected_area?: string
}

export interface UpdateAlerteData extends Partial<CreateAlerteData> {
  id: string
}

export interface AlertesResponse {
  data: Alerte[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export const ALERTES_QUERY_KEYS = {
  all: ['alertes'] as const,
  lists: () => [...ALERTES_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...ALERTES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...ALERTES_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...ALERTES_QUERY_KEYS.details(), documentId] as const,
}

export { ALERTE_SEVERITY_CONFIG as SEVERITY_CONFIG } from '../../lib/constants/alerte-types'

export const useAlertes = (params: {
  page?: number
  pageSize?: number
  severity?: AlerteSeverity
  active?: boolean
  alert_type?: AlerteType
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.severity) queryParams.append('filters[severity][$eq]', params.severity)
  if (params.active !== undefined) queryParams.append('filters[active][$eq]', params.active.toString())
  if (params.alert_type) queryParams.append('filters[alert_type][$eq]', params.alert_type)
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'desc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    queryParams.append('sort', 'createdAt:desc')
  }

  queryParams.append('populate', '*')

  return useQuery({
    queryKey: ALERTES_QUERY_KEYS.list(params),
    queryFn: async (): Promise<AlertesResponse> => {
      const url = `/api/alertes?${queryParams.toString()}`
      return apiClient.get<AlertesResponse>(url)
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useAlerte = (documentId: string) => {
  return useQuery({
    queryKey: ALERTES_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<Alerte> => {
      const url = `/api/alertes/${documentId}?populate=*`
      const response = await apiClient.get<{ data: Alerte }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 2,
  })
}

export const useCreateAlerte = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAlerteData): Promise<Alerte> => {
      const response = await apiClient.post<{ data: Alerte }>('/api/alertes', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALERTES_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateAlerte = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAlerteData): Promise<Alerte> => {
      const response = await apiClient.put<{ data: Alerte }>(`/api/alertes/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ALERTES_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: ALERTES_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteAlerte = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/alertes/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      queryClient.removeQueries({ queryKey: ALERTES_QUERY_KEYS.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: ALERTES_QUERY_KEYS.lists() })
    },
  })
}
