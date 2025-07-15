import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types alignés avec le schéma backend
export interface Event {
  id: number
  documentId: string
  title: string
  slug: string
  description: string
  start_date: string
  end_date?: string
  location?: string
  image?: {
    id: number
    url: string
    alternativeText?: string
    caption?: string
  }
  price?: string
  external_link?: string
  category: 'cultural' | 'sport' | 'meeting' | 'celebration' | 'workshop' | 'conference'
  organizer?: string
  contact_email?: string
  contact_phone?: string
  max_participants?: number
  registration_required: boolean
  registration_deadline?: string
  address?: string
  featured: boolean
  createdAt: string
  updatedAt: string
  site: {
    id: number
    name: string
    slug: string
  }
}

export interface CreateEventData {
  title: string
  description: string
  start_date: string
  end_date?: string
  location?: string
  image?: number
  price?: string
  external_link?: string
  category?: 'cultural' | 'sport' | 'meeting' | 'celebration' | 'workshop' | 'conference'
  organizer?: string
  contact_email?: string
  contact_phone?: string
  max_participants?: number
  registration_required?: boolean
  registration_deadline?: string
  address?: string
  featured?: boolean
}

export interface UpdateEventData extends Partial<CreateEventData> {
  id: string
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
  detail: (documentId: string) => [...EVENTS_QUERY_KEYS.details(), documentId] as const,
  upcoming: () => [...EVENTS_QUERY_KEYS.all, 'upcoming'] as const,
  calendar: (month: string) => [...EVENTS_QUERY_KEYS.all, 'calendar', month] as const,
}

// Hooks
export const useEvents = (params: {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  start_date?: string
  end_date?: string
  category?: 'cultural' | 'sport' | 'meeting' | 'celebration' | 'workshop' | 'conference'
  upcoming?: boolean
  featured?: boolean
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.search) queryParams.append('filters[title][$containsi]', params.search)
  if (params.start_date) queryParams.append('filters[start_date][$gte]', params.start_date)
  if (params.end_date) queryParams.append('filters[end_date][$lte]', params.end_date)
  if (params.category) queryParams.append('filters[category][$eq]', params.category)
  if (params.featured !== undefined) queryParams.append('filters[featured][$eq]', params.featured.toString())
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
  queryParams.append('populate', '*')

  return useQuery({
    queryKey: EVENTS_QUERY_KEYS.list(params),
    queryFn: async (): Promise<EventsResponse> => {
      const url = `/api/evenements?${queryParams.toString()}`
      return apiClient.get<EventsResponse>(url)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useEvent = (documentId: string) => {
  return useQuery({
    queryKey: EVENTS_QUERY_KEYS.detail(documentId),
    queryFn: async (): Promise<Event> => {
      const url = `/api/evenements/${documentId}`
      const response = await apiClient.get<{ data: Event }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useUpcomingEvents = (limit: number = 5) => {
  return useQuery({
    queryKey: EVENTS_QUERY_KEYS.upcoming(),
    queryFn: async (): Promise<Event[]> => {
      const today = new Date().toISOString().split('T')[0]
      const url = `/api/evenements?filters[start_date][$gte]=${today}&sort=start_date:asc&pagination[pageSize]=${limit}&populate=site,image`
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

      const url = `/api/evenements?filters[start_date][$gte]=${startDate}&filters[start_date][$lte]=${endDate}&sort=start_date:asc&populate=site,image`
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
      queryClient.setQueryData(EVENTS_QUERY_KEYS.detail(data.documentId), data)

      // Invalidate events list and upcoming events to refetch
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.upcoming() })
    },
  })
}

export const useDeleteEvent = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      await apiClient.delete(`/api/evenements/${documentId}`)
    },
    onSuccess: (_, documentId) => {
      // Remove the specific event from cache
      queryClient.removeQueries({ queryKey: EVENTS_QUERY_KEYS.detail(documentId) })

      // Invalidate events list and upcoming events to refetch
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: EVENTS_QUERY_KEYS.upcoming() })
    },
  })
}

export const useToggleEventFeatured = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, featured }: { documentId: string, featured: boolean }): Promise<Event> => {
      const response = await apiClient.put<{ data: Event }>(`/api/evenements/${documentId}`, {
        data: { featured }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific event in cache
      queryClient.setQueryData(EVENTS_QUERY_KEYS.detail(data.documentId), data)

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
      // Create a copy with modified title and reset dates
      const duplicateData: CreateEventData = {
        title: `${originalEvent.title} (Copie)`,
        description: originalEvent.description,
        start_date: originalEvent.start_date,
        end_date: originalEvent.end_date,
        location: originalEvent.location,
        image: originalEvent.image?.id,
        price: originalEvent.price,
        external_link: originalEvent.external_link,
        category: originalEvent.category,
        organizer: originalEvent.organizer,
        contact_email: originalEvent.contact_email,
        contact_phone: originalEvent.contact_phone,
        max_participants: originalEvent.max_participants,
        registration_required: originalEvent.registration_required,
        registration_deadline: originalEvent.registration_deadline,
        address: originalEvent.address,
        featured: false, // New events are not featured by default
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
