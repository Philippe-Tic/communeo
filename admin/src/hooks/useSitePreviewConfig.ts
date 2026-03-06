import { getMediaUrl } from '@/lib/utils'
import { computeOnPrimaryHex, computePrimaryTextHex, computeFooterBgHex, DEFAULT_PRIMARY } from '@/lib/color-utils'
import { useSite } from './api/useSites'
import { useUserSite } from './useUser'

export interface SitePreviewConfig {
  primaryColor: string
  onPrimaryColor: string
  primaryTextColor: string
  footerBgColor: string
  siteName: string
  logoUrl: string | null
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
  const primaryColor = colors.primary || DEFAULT_PRIMARY

  const logoUrl = site.logo?.url ? getMediaUrl(site.logo.url) : null

  return {
    config: {
      primaryColor,
      onPrimaryColor: computeOnPrimaryHex(primaryColor),
      primaryTextColor: computePrimaryTextHex(primaryColor),
      footerBgColor: computeFooterBgHex(primaryColor),
      siteName: site.name,
      logoUrl,
    },
    isLoading,
  }
}
