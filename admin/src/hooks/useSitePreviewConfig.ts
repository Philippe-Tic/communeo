import { getMediaUrl } from '@/lib/utils'
import { useSite } from './api/useSites'
import { useUserSite } from './useUser'

export interface SitePreviewConfig {
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

  const logoUrl = site.logo?.url ? getMediaUrl(site.logo.url) : null

  return {
    config: {
      primaryColor,
      secondaryColor,
      siteName: site.name,
      logoUrl,
    },
    isLoading,
  }
}
