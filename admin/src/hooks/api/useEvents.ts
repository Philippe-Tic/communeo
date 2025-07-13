import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types
export interface Event {
  id: number
  title: string
  slug: string
  description: string
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
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  location?: string
  address?: string
  is_all_day?: boolean
  is_recurring?: boolean
  recurring_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurring_end_date?: string
  max_attendees?: number
  registration_enabled?: boolean
  registration_deadline?: string
  price?: number
  currency?: string
  contact_email?: string
  contact_phone?: string
  external_url?: string
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

export interface CreateEventData {
  title: string
  description: string
  excerpt?: string
  status?: 'draft' | 'published'
  featured_image?: number
  start_date: string
  end_date?: string
  start_time?: string
  end_time?: string
  location?: string
  address?: string
  is_all_day?: boolean
  is_recurring?: boolean
  recurring_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurring_end_date?: string
  max_attendees?: number
  registration_enabled?: boolean
  registration_deadline?: string
  price?: number
  currency?: string
  contact_email?: string
  contact_phone?: string
  external_url?: string
  categories?: number[]
  tags?: number[]
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: number
}

export interface EventsResponse {
  data: Event[]
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
export const EVENTS_QUERY_KEYS = {
  all: ['events'] as const,
  lists: () => [...EVENTS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...EVENTS_QUERY_KEYS.lists(), filters] as const,
  details: () => [...EVENTS_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...EVENTS_QUERY_KEYS.details(), id] as const,
  upcoming: () => [...EVENTS_QUERY_KEYS.all, 'upcoming'] as const,
  calendar: (month: string) => [...EVENTS_QUERY_KEYS.all, 'calendar', month] as const,
}

// Hooks
export const useEvents = (params: {
  page?: number
  pageSize?: number
  status?: 'draft' | 'published' | 'archived'
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  start_date?: string
  end_date?: string
  category?: number
  upcoming?: boolean
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.status) queryParams.append('filters[status][$eq]', params.status)
  if (params.search) queryParams.append('filters[title][$containsi]', params.search)
  if (params.start_date) queryParams.append('filters[start_date][$gte]', params.start_date)
  if (params.end_date) queryParams.append('filters[end_date][$lte]', params.end_date)
  if (params.category) queryParams.append('filters[categories][$eq]', params.category.toString())
  if (params.upcoming) {
    const today = new Date().toISOString().split('T')[0]
    queryParams.append('filters[start_date][$gte]', today)
  }
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    // Default sort by start_date
    queryParams.append('sort', 'start_date:asc')
  }

  // Always populate relations
  queryParams.append('populate', 'author,site,categories,tags,featured_image')

  return useQuery({
    queryKey: EVENTS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<EventsResponse> => {
      const url = `/api/evenements?${queryParams.toString()}`
      return apiClient.get<EventsResponse>(url)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useEvent = (id: number) => {
  return useQuery({
    queryKey: EVENTS_QUERY_KEYS.detail(id),
    queryFn: async (): Promise<Event> => {
      const url = `/api/evenements/${id}?populate=author,site,categories,tags,featured_image`
      const response = await apiClient.get<{ data: Event }>(url)
      return response.data
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useUpcomingEvents = (limit: number = 5) => {
  return useQuery({
    queryKey: EVENTS_QUERY_KEYS.upcoming(),
    queryFn: async (): Promise<Event[]> => {
      const today = new Date().toISOString().split('T')[0]
      const url = `/api/evenements?filters[start_date][$gte]=${today}&filters[status][$eq]=published&sort=start_date:asc&pagination[pageSize]=${limit}&populate=author,site,categories,tags,featured_image`
      const response = await apiClient.get<EventsResponse>(url)
      return response.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export const useCalendarEvents = (month: string) => {
  return useQuery({
    queryKey: EVENTS_QUERY_KEYS.calendar(month),
    queryFn: async (): Promise<Event[]> => {
      const [year, monthNum] = month.split('-')
      const startDate = `${year}-${monthNum}-01`
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0]

      const url = `/api/evenements?filters[start_date][$gte]=${startDate}&filters[start_date][$lte]=${endDate}&filters[status][$eq]=published&sort=start_date:asc&populate=author,site,categories,tags,featured_image`
      const response = await apiClient.get<EventsResponse>(url)
      return response.data
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}

export const useCreateEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateEventData): Promise<Event> => {
      const response = await apiClient.post<{ data: Event }>('/api/evenements', { data })
      return response.data
    },
    onSuccess: () => {
      // Invalidate events list and upcoming events to refetch
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.upcoming() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.all })
    },
  })
}

export const useUpdateEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateEventData): Promise<Event> => {
      const response = await apiClient.put<{ data: Event }>(`/api/evenements/${id}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific event in cache
      queryClient.setQueryData(EVENTS_QUERY_KEYS.detail(data.id), data)

      // Invalidate events list and upcoming events to refetch
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.upcoming() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.all })
    },
  })
}

export const useDeleteEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/api/evenements/${id}`)
    },
    onSuccess: (_, id) => {
      // Remove the event from cache
      queryClient.removeQueries({ queryKey: EVENTS_QUERY_KEYS.detail(id) })

      // Invalidate events list and upcoming events to refetch
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.upcoming() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.all })
    },
  })
}

export const usePublishEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<Event> => {
      const response = await apiClient.put<{ data: Event }>(`/api/evenements/${id}`, {
        data: { status: 'published', publishedAt: new Date().toISOString() }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific event in cache
      queryClient.setQueryData(EVENTS_QUERY_KEYS.detail(data.id), data)

      // Invalidate events list and upcoming events to refetch
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.upcoming() })
    },
  })
}

export const useUnpublishEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number): Promise<Event> => {
      const response = await apiClient.put<{ data: Event }>(`/api/evenements/${id}`, {
        data: { status: 'draft', publishedAt: null }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific event in cache
      queryClient.setQueryData(EVENTS_QUERY_KEYS.detail(data.id), data)

      // Invalidate events list and upcoming events to refetch
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.upcoming() })
    },
  })
}

export const useDuplicateEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (originalEvent: Event): Promise<Event> => {
      // Create a copy with modified title and draft status
      const duplicateData: CreateEventData = {
        title: `${originalEvent.title} (Copie)`,
        description: originalEvent.description,
        excerpt: originalEvent.excerpt,
        status: 'draft',
        featured_image: originalEvent.featured_image?.id,
        start_date: originalEvent.start_date,
        end_date: originalEvent.end_date,
        start_time: originalEvent.start_time,
        end_time: originalEvent.end_time,
        location: originalEvent.location,
        address: originalEvent.address,
        is_all_day: originalEvent.is_all_day,
        is_recurring: originalEvent.is_recurring,
        recurring_pattern: originalEvent.recurring_pattern,
        recurring_end_date: originalEvent.recurring_end_date,
        max_attendees: originalEvent.max_attendees,
        registration_enabled: originalEvent.registration_enabled,
        registration_deadline: originalEvent.registration_deadline,
        price: originalEvent.price,
        currency: originalEvent.currency,
        contact_email: originalEvent.contact_email,
        contact_phone: originalEvent.contact_phone,
        external_url: originalEvent.external_url,
        categories: originalEvent.categories?.map(cat => cat.id),
        tags: originalEvent.tags?.map(tag => tag.id),
      }

      const response = await apiClient.post<{ data: Event }>('/api/evenements', { data: duplicateData })
      return response.data
    },
    onSuccess: () => {
      // Invalidate events list to refetch
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.lists() })
    },
  })
}
