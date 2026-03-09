import type { SiteConfigFormData, ImageData } from './types'
import type { HomepageQuickLink, HomepageKeyFigure, HomepagePartner, NavigationItem, SocialLink } from '../../hooks/api/useSites'

type SectionPayload = Record<string, unknown>

export function buildGeneralPayload(
  formData: SiteConfigFormData,
  logoImage: ImageData | null,
  faviconImage: ImageData | null,
): SectionPayload {
  let parsedColors = null
  if (formData.colors.trim()) {
    try { parsedColors = JSON.parse(formData.colors) } catch { /* validated earlier */ }
  }
  return {
    name: formData.name,
    contact_mail: formData.contact_mail,
    contact_phone: formData.contact_phone || undefined,
    address: formData.address || undefined,
    colors: parsedColors,
    logo: logoImage?.id || undefined,
    favicon: faviconImage?.id || undefined,
    auto_deploy_enabled: formData.auto_deploy_enabled,
    auto_deploy_delay: Number(formData.auto_deploy_delay) || 300,
  }
}

export function buildLegalPayload(formData: SiteConfigFormData): SectionPayload {
  return {
    mentions_legales: {
      siret: formData.siret || undefined,
      publication_director: formData.publication_director || undefined,
      publication_director_title: formData.publication_director_title || undefined,
      hebergeur_name: formData.hebergeur_name || undefined,
      hebergeur_address: formData.hebergeur_address || undefined,
      hebergeur_phone: formData.hebergeur_phone || undefined,
      credits: formData.credits || undefined,
      mentions_legales_extra: formData.mentions_legales_extra || undefined,
    },
  }
}

export function buildRgpdPayload(formData: SiteConfigFormData): SectionPayload {
  return {
    rgpd: {
      dpo_name: formData.dpo_name || undefined,
      dpo_email: formData.dpo_email || undefined,
      dpo_phone: formData.dpo_phone || undefined,
      rgpd_policy: formData.rgpd_policy || undefined,
    },
  }
}

export function buildAccessibilityPayload(formData: SiteConfigFormData): SectionPayload {
  return {
    accessibilite: {
      accessibility_level: formData.accessibility_level || undefined,
      accessibility_declaration: formData.accessibility_declaration || undefined,
      accessibility_schema_url: formData.accessibility_schema_url || undefined,
      accessibility_action_plan_url: formData.accessibility_action_plan_url || undefined,
    },
  }
}

export function buildInfoPayload(formData: SiteConfigFormData): SectionPayload {
  let parsedOpeningHours = null
  if (formData.opening_hours.trim()) {
    try { parsedOpeningHours = JSON.parse(formData.opening_hours) } catch { /* validated earlier */ }
  }
  return {
    infos_pratiques: {
      opening_hours: parsedOpeningHours,
      population: formData.population ? Number(formData.population) : undefined,
      contact_form_intro: formData.contact_form_intro || undefined,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
    },
  }
}

export function buildOpenDataPayload(formData: SiteConfigFormData): SectionPayload {
  return {
    open_data_enabled: formData.open_data_enabled,
    open_data_url: formData.open_data_url || undefined,
    open_data_platform: formData.open_data_platform,
  }
}

export function buildDemarchesPayload(formData: SiteConfigFormData): SectionPayload {
  const audiences: string[] = []
  if (formData.comarquage_audiences_particuliers) audiences.push('particuliers')
  if (formData.comarquage_audiences_professionnels) audiences.push('professionnels')

  return {
    code_insee: formData.code_insee || undefined,
    comarquage_enabled: formData.comarquage_enabled,
    comarquage_audiences: audiences,
  }
}

export function buildHomepagePayload(
  formData: SiteConfigFormData,
  heroImage: ImageData | null,
  quickLinks: HomepageQuickLink[],
  keyFigures: HomepageKeyFigure[],
  partners: HomepagePartner[],
): SectionPayload {
  return {
    homepage: {
      content: formData.homepage_content || undefined,
      meta_description: formData.homepage_meta_description || undefined,
      hero_title: formData.hero_title || undefined,
      hero_subtitle: formData.hero_subtitle || undefined,
      hero_image: heroImage?.id ? heroImage.id : undefined,
      hero_cta_primary_label: formData.hero_cta_primary_label || undefined,
      hero_cta_primary_url: formData.hero_cta_primary_url || undefined,
      hero_cta_secondary_label: formData.hero_cta_secondary_label || undefined,
      hero_cta_secondary_url: formData.hero_cta_secondary_url || undefined,
      show_quick_links: formData.show_quick_links,
      quick_links: quickLinks.map(({ id: _id, ...rest }) => rest),
      show_mayor_word: formData.show_mayor_word,
      mayor_word_title: formData.mayor_word_title || undefined,
      mayor_word_content: formData.mayor_word_content || undefined,
      show_articles: formData.show_articles,
      articles_count: Number(formData.articles_count) || 3,
      show_events: formData.show_events,
      events_count: Number(formData.events_count) || 3,
      show_key_figures: formData.show_key_figures,
      key_figures: keyFigures.map(({ id: _id, ...rest }) => rest),
      show_associations: formData.show_associations,
      associations_count: Number(formData.associations_count) || 6,
      show_partners: formData.show_partners,
      show_weather: formData.show_weather,
      show_waste_collection: formData.show_waste_collection,
      show_disruptions: formData.show_disruptions,
      show_newsletter: formData.show_newsletter,
      show_school_menu: formData.show_school_menu,
      partners: partners.map(({ id: _id, logo, ...rest }) => ({
        ...rest,
        logo: logo?.id ? logo.id : undefined,
      })),
    },
  }
}

export function buildNavigationPayload(navigationItems: NavigationItem[]): SectionPayload {
  return {
    navigation_config: navigationItems.length > 0 ? navigationItems : undefined,
  }
}

export function buildSocialPayload(socialLinks: SocialLink[]): SectionPayload {
  return {
    social_links: socialLinks.map(({ id: _id, icon, ...rest }) => ({
      ...rest,
      icon: icon?.id ? icon.id : undefined,
    })),
  }
}
