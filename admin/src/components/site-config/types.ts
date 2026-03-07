import type { HomepageQuickLink, HomepageKeyFigure, HomepagePartner, NavigationItem, SocialLink } from '../../hooks/api/useSites'
import type { Page } from '../../hooks/api/usePages'

export interface ImageData {
  id: number
  documentId: string
  name: string
  url: string
  mime: string
  size: number
  ext: string
}

export interface SiteConfigFormData {
  name: string
  contact_mail: string
  contact_phone: string
  address: string
  colors: string
  siret: string
  publication_director: string
  publication_director_title: string
  hebergeur_name: string
  hebergeur_address: string
  hebergeur_phone: string
  credits: string
  mentions_legales_extra: string
  dpo_name: string
  dpo_email: string
  dpo_phone: string
  rgpd_policy: string
  accessibility_level: '' | 'non-conforme' | 'partiellement-conforme' | 'conforme'
  accessibility_declaration: string
  accessibility_schema_url: string
  accessibility_action_plan_url: string
  opening_hours: string
  population: string
  contact_form_intro: string
  open_data_enabled: boolean
  open_data_url: string
  open_data_platform: 'data-gouv-fr' | 'opendatasoft' | 'custom' | 'none'
  has_dispositif_recueil: boolean
  appointment_url: string
  appointment_provider: 'synbird' | 'ants-rdv' | 'rdv-service-public' | 'autre'
  remise_titre_info: string
  auto_deploy_enabled: boolean
  auto_deploy_delay: string
  homepage_content: string
  homepage_meta_description: string
  hero_title: string
  hero_subtitle: string
  hero_cta_primary_label: string
  hero_cta_primary_url: string
  hero_cta_secondary_label: string
  hero_cta_secondary_url: string
  show_quick_links: boolean
  show_mayor_word: boolean
  mayor_word_title: string
  mayor_word_content: string
  show_articles: boolean
  articles_count: string
  show_events: boolean
  events_count: string
  show_key_figures: boolean
  show_associations: boolean
  associations_count: string
  show_partners: boolean
  latitude: string
  longitude: string
  show_weather: boolean
  show_waste_collection: boolean
  show_disruptions: boolean
}

export interface SectionBaseProps {
  formData: SiteConfigFormData
  onFieldChange: (field: string, value: string) => void
  errors: Record<string, string>
  setIsDirty: (dirty: boolean) => void
  setFormData: React.Dispatch<React.SetStateAction<SiteConfigFormData>>
}

export interface GeneralSectionProps extends SectionBaseProps {
  siteSlug: string
  logoImage: ImageData | null
  setLogoImage: (img: ImageData | null) => void
  faviconImage: ImageData | null
  setFaviconImage: (img: ImageData | null) => void
}

export interface HomepageSectionProps extends SectionBaseProps {
  heroImage: ImageData | null
  setHeroImage: (img: ImageData | null) => void
  quickLinks: HomepageQuickLink[]
  setQuickLinks: React.Dispatch<React.SetStateAction<HomepageQuickLink[]>>
  keyFigures: HomepageKeyFigure[]
  setKeyFigures: React.Dispatch<React.SetStateAction<HomepageKeyFigure[]>>
  partners: HomepagePartner[]
  setPartners: React.Dispatch<React.SetStateAction<HomepagePartner[]>>
}

export interface NavigationSectionProps {
  navigationItems: NavigationItem[]
  setNavigationItems: (items: NavigationItem[]) => void
  setIsDirty: (dirty: boolean) => void
  pages: Page[]
}

export interface SocialSectionProps {
  socialLinks: SocialLink[]
  setSocialLinks: React.Dispatch<React.SetStateAction<SocialLink[]>>
  setIsDirty: (dirty: boolean) => void
}

export interface SectionConfig {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}
