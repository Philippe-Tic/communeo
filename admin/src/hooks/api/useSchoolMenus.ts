import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'
import type { MenuMode, MealDay, MealLabel } from '../../lib/constants/school-menu-types'

export interface Meal {
  id?: number
  day: MealDay
  starter?: string
  main_course: string
  side_dish?: string
  dairy?: string
  dessert?: string
  snack?: string
  labels?: MealLabel[]
}

export interface SchoolMenu {
  id: number
  documentId: string
  week_start: string
  menu_mode: MenuMode
  menu_image?: {
    id: number
    documentId: string
    name: string
    url: string
    mime: string
    size: number
  } | null
  menu_pdf?: {
    id: number
    documentId: string
    name: string
    url: string
    mime: string
    size: number
  } | null
  meals?: Meal[]
  school_name?: string
  site: {
    id: number
    documentId: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateSchoolMenuData {
  week_start: string
  menu_mode: MenuMode
  menu_image?: number
  menu_pdf?: number
  meals?: Omit<Meal, 'id'>[]
  school_name?: string
}

export interface UpdateSchoolMenuData extends Partial<CreateSchoolMenuData> {
  id: string
}

export interface SchoolMenusResponse {
  data: SchoolMenu[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

const POPULATE = 'populate[meals]=true&populate[menu_image]=true&populate[menu_pdf]=true&populate[site]=true'

export const SCHOOL_MENUS_QUERY_KEYS = {
  all: ['school-menus'] as const,
  lists: () => [...SCHOOL_MENUS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...SCHOOL_MENUS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...SCHOOL_MENUS_QUERY_KEYS.all, 'detail'] as const,
  detail: (documentId: string) => [...SCHOOL_MENUS_QUERY_KEYS.details(), documentId] as const,
}

export const useSchoolMenus = (params: {
  week_start?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.week_start) queryParams.append('filters[week_start][$eq]', params.week_start)
  if (params.sortBy) {
    queryParams.append('sort', `${params.sortBy}:${params.sortOrder || 'desc'}`)
  } else {
    queryParams.append('sort', 'week_start:desc')
  }

  return useQuery({
    queryKey: SCHOOL_MENUS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<SchoolMenusResponse> => {
      const url = `/api/school-menus?${POPULATE}&${queryParams.toString()}`
      return apiClient.get<SchoolMenusResponse>(url)
    },
    staleTime: 1000 * 60 * 2,
  })
}

export const useSchoolMenu = (documentId: string) => {
  return useQuery({
    queryKey: SCHOOL_MENUS_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<SchoolMenu> => {
      const url = `/api/school-menus/${documentId}?${POPULATE}`
      const response = await apiClient.get<{ data: SchoolMenu }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 2,
  })
}

export const useCreateSchoolMenu = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSchoolMenuData): Promise<SchoolMenu> => {
      const response = await apiClient.post<{ data: SchoolMenu }>('/api/school-menus', { data })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHOOL_MENUS_QUERY_KEYS.lists() })
    },
  })
}

export const useUpdateSchoolMenu = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateSchoolMenuData): Promise<SchoolMenu> => {
      const response = await apiClient.put<{ data: SchoolMenu }>(`/api/school-menus/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(SCHOOL_MENUS_QUERY_KEYS.detail(data.documentId), data)
      queryClient.invalidateQueries({ queryKey: SCHOOL_MENUS_QUERY_KEYS.lists() })
    },
  })
}

export const useDeleteSchoolMenu = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/school-menus/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      queryClient.removeQueries({ queryKey: SCHOOL_MENUS_QUERY_KEYS.detail(documentId) })
      queryClient.invalidateQueries({ queryKey: SCHOOL_MENUS_QUERY_KEYS.lists() })
    },
  })
}
