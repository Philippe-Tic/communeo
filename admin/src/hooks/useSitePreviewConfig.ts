import { useSite } from './api/useSites'
import { useUserSite } from './useUser'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

export interface SitePreviewConfig {
  theme: 'classique' | 'moderne' | 'accessible'
  primaryColor: string
  secondaryColor: string
  siteName: string
  logoUrl: string | null
}

const DEFAULT_COLORS = {
  primary: '#1e40af',
  secondary: '#0369a1',
}

export function useSitePreviewConfig(): {
  config: SitePreviewConfig | null
  isLoading: boolean
} {
  const { site: userSite } = useUserSite()
  const { data: site, isLoading } = useSite(userSite?.documentId || '')

  if (!site) {
    return { config: null, isLoading }
  }

  const colors = site.colors || {}
  const primaryColor = colors.primary || DEFAULT_COLORS.primary
  const secondaryColor = colors.secondary || DEFAULT_COLORS.secondary

  const logoUrl = site.logo?.url
    ? site.logo.url.startsWith('http')
      ? site.logo.url
      : `${API_URL}${site.logo.url}`
    : null

  // Map Strapi theme names to CSS class names
  const theme = site.theme || 'classique'

  return {
    config: {
      theme,
      primaryColor,
      secondaryColor,
      siteName: site.name,
      logoUrl,
    },
    isLoading,
  }
}
