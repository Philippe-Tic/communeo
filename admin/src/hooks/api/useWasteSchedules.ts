import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'
import type { WasteType, CollectionDay, Frequency } from '../../lib/constants/waste-types'

export interface WasteSchedule {
  id: number
  documentId: string
  waste_type: WasteType
  collection_day: CollectionDay
  frequency: Frequency
  start_date?: string
  zone?: string
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateWasteScheduleData {
  waste_type: WasteType
  collection_day: CollectionDay
  frequency: Frequency
  start_date?: string
  zone?: string
  notes?: string
  active?: boolean
}

export interface UpdateWasteScheduleData extends Partial<CreateWasteScheduleData> {
  id: string
}

export interface WasteSchedulesResponse {
  data: WasteSchedule[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

export const WASTE_SCHEDULES_QUERY_KEYS = {
  all: ['waste-schedules'] as const,
  lists: () => [...WASTE_SCHEDULES_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...WASTE_SCHEDULES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...WASTE_SCHEDULES_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...WASTE_SCHEDULES_QUERY_KEYS.details(), documentId] as const,
}

export { WASTE_TYPE_CONFIG } from '../../lib/constants/waste-types'

export const useWasteSchedules = (params: {
  page?: number
  pageSize?: number
  waste_type?: WasteType
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.waste_type) queryParams.append('filters[waste_type][$eq]', params.waste_type)
  if (params.active !== undefined) queryParams.append('filters[active][$eq]', params.active.toString())
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'desc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    queryParams.append('sort', 'waste_type:asc')
  }

  queryParams.append('populate', '*')

  return useQuery({
    queryKey: WASTE_SCHEDULES_QUERY_KEYS.list(params),
    queryFn: async (): Promise<WasteSchedulesResponse> => {
      const url = `/api/waste-schedules?${queryParams.toString()}`
      return apiClient.get<WasteSchedulesResponse>(url)
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useWasteSchedule = (documentId: string) => {
  return useQuery({
    queryKey: WASTE_SCHEDULES_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<WasteSchedule> => {
      const url = `/api/waste-schedules/${documentId}?populate=*`
      const response = await apiClient.get<{ data: WasteSchedule }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 2,
  })
}

export const useCreateWasteSchedule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateWasteScheduleData): Promise<WasteSchedule> => {
      const response = await apiClient.post<{ data: WasteSchedule }>('/api/waste-schedules', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WASTE_SCHEDULES_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateWasteSchedule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateWasteScheduleData): Promise<WasteSchedule> => {
      const response = await apiClient.put<{ data: WasteSchedule }>(`/api/waste-schedules/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(WASTE_SCHEDULES_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: WASTE_SCHEDULES_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteWasteSchedule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/waste-schedules/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      queryClient.removeQueries({ queryKey: WASTE_SCHEDULES_QUERY_KEYS.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: WASTE_SCHEDULES_QUERY_KEYS.lists() })
    },
  })
}
