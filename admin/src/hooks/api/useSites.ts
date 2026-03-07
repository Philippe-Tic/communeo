import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../../services/apiClient'

// Types — Navigation configurable
export type SectionKey = 'articles' | 'evenements' | 'documents' | 'equipe' | 'associations' | 'demarches' | 'open-data' | 'collecte-dechets' | 'perturbations'

export interface NavigationItem {
  id: string              // UUID pour le drag & drop
  type: 'section' | 'page'
  key?: SectionKey        // Clé section (si type=section)
  pageDocumentId?: string // DocumentId page (si type=page)
  label?: string          // Label custom (undefined = défaut)
  enabled: boolean        // Toggle visibilité
}

// Types — Réseaux sociaux
export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'tiktok' | 'autre'

export interface SocialLink {
  id?: number
  platform: SocialPlatform
  url: string
  label?: string
  icon?: { id: number; documentId: string; name: string; url: string; mime: string; size: number; ext: string } | null
}

// Types — Composants légaux Strapi
export interface MentionsLegales {
  id?: number
  siret?: string
  publication_director?: string
  publication_director_title?: string
  hebergeur_name?: string
  hebergeur_address?: string
  hebergeur_phone?: string
  credits?: string
  mentions_legales_extra?: string
}

export interface RGPD {
  id?: number
  rgpd_policy?: string
  dpo_name?: string
  dpo_email?: string
  dpo_phone?: string
}

export interface Accessibilite {
  id?: number
  accessibility_level?: 'non-conforme' | 'partiellement-conforme' | 'conforme'
  accessibility_declaration?: string
  accessibility_schema_url?: string
  accessibility_action_plan_url?: string
}

export interface InfosPratiques {
  id?: number
  opening_hours?: any
  population?: number
  contact_form_intro?: string
  latitude?: number
  longitude?: number
}

export interface DemarchesIdentite {
  id?: number
  has_dispositif_recueil?: boolean
  appointment_url?: string
  appointment_provider?: 'synbird' | 'ants-rdv' | 'rdv-service-public' | 'autre'
  remise_titre_info?: string
}

// Types — Homepage config
export type QuickLinkIcon = 'document' | 'identity' | 'folder' | 'mail' | 'alert' | 'clock' | 'phone' | 'map' | 'calendar' | 'users' | 'building' | 'heart' | 'info' | 'shield' | 'book' | 'globe'
export type KeyFigureIcon = 'users' | 'map' | 'building' | 'calendar' | 'heart' | 'book' | 'globe' | 'shield' | 'tree' | 'star'

export interface HomepageQuickLink {
  id?: number
  label: string
  url: string
  description?: string
  icon?: QuickLinkIcon
}

export interface HomepageKeyFigure {
  id?: number
  value: string
  label: string
  icon?: KeyFigureIcon
}

export interface HomepagePartner {
  id?: number
  name: string
  logo?: { id: number; documentId: string; name: string; url: string; mime: string; size: number; ext: string } | null
  url?: string
}

export interface HomepageConfig {
  id?: number
  hero_title?: string
  hero_subtitle?: string
  hero_image?: { id: number; documentId: string; name: string; url: string; mime: string; size: number; ext: string } | null
  hero_cta_primary_label?: string
  hero_cta_primary_url?: string
  hero_cta_secondary_label?: string
  hero_cta_secondary_url?: string
  content?: string
  meta_description?: string
  show_quick_links?: boolean
  quick_links?: HomepageQuickLink[]
  show_mayor_word?: boolean
  mayor_word_title?: string
  mayor_word_content?: string
  show_articles?: boolean
  articles_count?: number
  show_events?: boolean
  events_count?: number
  show_key_figures?: boolean
  key_figures?: HomepageKeyFigure[]
  show_associations?: boolean
  associations_count?: number
  show_partners?: boolean
  partners?: HomepagePartner[]
  show_weather?: boolean
  show_waste_collection?: boolean
  show_disruptions?: boolean
}

export interface Site {
  id: number
  documentId: string
  name: string
  slug: string
  colors?: any // JSON field
  logo?: {
    id: number
    url: string
    alternativeText?: string
    caption?: string
  }
  favicon?: {
    id: number
    url: string
    alternativeText?: string
    caption?: string
  }
  contact_mail: string
  contact_phone?: string
  address?: string
  createdAt: string
  updatedAt: string
  // Composants légaux
  mentions_legales?: MentionsLegales
  rgpd?: RGPD
  accessibilite?: Accessibilite
  infos_pratiques?: InfosPratiques
  demarches_identite?: DemarchesIdentite
  // Open Data
  open_data_enabled?: boolean
  open_data_url?: string
  open_data_platform?: 'data-gouv-fr' | 'opendatasoft' | 'custom' | 'none'
  // Homepage
  homepage?: HomepageConfig
  // Auto-deploy
  auto_deploy_enabled?: boolean
  auto_deploy_delay?: number
  // Navigation
  navigation_config?: NavigationItem[]
  // Réseaux sociaux
  social_links?: SocialLink[]
  // Relations
  pages?: any[]
  articles?: any[]
  evenements?: any[]
}

export interface CreateSiteData {
  name: string
  slug?: string
  colors?: any
  logo?: number
  favicon?: number
  contact_mail: string
  contact_phone?: string
  address?: string
  // Composants légaux
  mentions_legales?: Partial<Omit<MentionsLegales, 'id'>>
  rgpd?: Partial<Omit<RGPD, 'id'>>
  accessibilite?: Partial<Omit<Accessibilite, 'id'>>
  infos_pratiques?: Partial<Omit<InfosPratiques, 'id'>>
  demarches_identite?: Partial<Omit<DemarchesIdentite, 'id'>>
  // Open Data
  open_data_enabled?: boolean
  open_data_url?: string
  open_data_platform?: 'data-gouv-fr' | 'opendatasoft' | 'custom' | 'none'
  // Homepage
  homepage?: Partial<Omit<HomepageConfig, 'id'>>
  // Auto-deploy
  auto_deploy_enabled?: boolean
  auto_deploy_delay?: number
  // Navigation
  navigation_config?: NavigationItem[]
  // Réseaux sociaux
  social_links?: (Partial<Omit<SocialLink, 'id' | 'icon'>> & { icon?: number | null })[]
}

export interface UpdateSiteData extends Partial<CreateSiteData> {
  documentId: string
}

export interface SitesResponse {
  data: Site[]
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
export const SITES_QUERY_KEYS = {
  all: ['sites'] as const,
  lists: () => [...SITES_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...SITES_QUERY_KEYS.lists(), filters] as const,
  details: () => [...SITES_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...SITES_QUERY_KEYS.details(), id] as const,
  current: () => [...SITES_QUERY_KEYS.all, 'current'] as const,
}

// Hooks
export const useSites = (params: {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  is_active?: boolean
} = {}) => {
  const queryParams = new URLSearchParams()

  if (params.page) queryParams.append('pagination[page]', params.page.toString())
  if (params.pageSize) queryParams.append('pagination[pageSize]', params.pageSize.toString())
  if (params.search) queryParams.append('filters[name][$containsi]', params.search)
  if (params.is_active !== undefined) queryParams.append('filters[is_active][$eq]', params.is_active.toString())
  if (params.sortBy) {
    const sortOrder = params.sortOrder || 'asc'
    queryParams.append('sort', `${params.sortBy}:${sortOrder}`)
  } else {
    // Default sort by name
    queryParams.append('sort', 'name:asc')
  }

  // Always populate relations
  queryParams.append('populate', '*')

  return useQuery({
    queryKey: SITES_QUERY_KEYS.list(params),
    queryFn: async (): Promise<SitesResponse> => {
      const url = `/api/sites?${queryParams.toString()}`
      return apiClient.get<SitesResponse>(url)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useSite = (documentId: string) => {
  return useQuery({
    queryKey: [...SITES_QUERY_KEYS.current(), documentId],
    queryFn: async (): Promise<Site> => {
      const params = new URLSearchParams()
      // Populate fields with 'true' (not '*' which causes Strapi v5 to recurse into media internal relations like logo.related)
      params.append('populate[logo]', 'true')
      params.append('populate[favicon]', 'true')
      params.append('populate[mentions_legales]', 'true')
      params.append('populate[rgpd]', 'true')
      params.append('populate[accessibilite]', 'true')
      params.append('populate[infos_pratiques]', 'true')
      params.append('populate[demarches_identite]', 'true')
      params.append('populate[homepage][populate][hero_image]', 'true')
      params.append('populate[homepage][populate][quick_links]', 'true')
      params.append('populate[homepage][populate][key_figures]', 'true')
      params.append('populate[homepage][populate][partners][populate][logo]', 'true')
      params.append('populate[social_links][populate][icon]', 'true')
      const url = `/api/sites/${documentId}?${params.toString()}`
      const response = await apiClient.get<{ data: Site }>(url)
      return response.data
    },
    enabled: !!documentId,
    staleTime: 1000 * 60 * 10, // 10 minutes (current site changes less frequently)
  })
}

export const useUpdateSite = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ documentId, ...data }: UpdateSiteData): Promise<Site> => {
      const response = await apiClient.put<{ data: Site }>(`/api/sites/${documentId}`, { data })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific site in cache
      queryClient.setQueryData(SITES_QUERY_KEYS.detail(data.id), data)

      // Invalidate sites list to refetch
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.lists() })

      // Invalidate current site if it's the one being updated
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.current() })
    },
  })
}

export const useToggleMaintenanceMode = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { id: number; maintenance_mode: boolean; maintenance_message?: string }): Promise<Site> => {
      const response = await apiClient.put<{ data: Site }>(`/api/sites/${params.id}`, {
        data: {
          maintenance_mode: params.maintenance_mode,
          maintenance_message: params.maintenance_message || null
        }
      })
      return response.data
    },
    onSuccess: (data) => {
      // Update the specific site in cache
      queryClient.setQueryData(SITES_QUERY_KEYS.detail(data.id), data)

      // Invalidate sites list to refetch
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.lists() })

      // Invalidate current site if it's the one being updated
      queryClient.invalidateQueries({ queryKey: SITES_QUERY_KEYS.current() })
    },
  })
}
