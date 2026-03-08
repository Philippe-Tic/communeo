import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  GeneralSection,
  LegalSection,
  RgpdSection,
  AccessibilitySection,
  InfoSection,
  OpenDataSection,
  DemarchesSection,
  HomepageSection,
  NavigationSection,
  SocialSection,
  SiteConfigNav,
  SiteConfigMobileNav,
  SECTIONS,
  SECTION_FIELDS,
} from '../components/site-config'
import type { SiteConfigFormData, ImageData } from '../components/site-config'
import { useSite, useUpdateSite, type UpdateSiteData, type NavigationItem, type HomepageQuickLink, type HomepageKeyFigure, type HomepagePartner, type SocialLink } from '../hooks/api/useSites'
import { usePages } from '../hooks/api/usePages'
import { useCanManageSite, useUserSite } from '../hooks/useUser'
import { useActiveSection } from '../hooks/useActiveSection'
import { useIsMobile } from '../hooks/useIsMobile'
import { toaster } from '../lib/toaster'

const SECTION_KEYS = SECTIONS.map(s => s.key)

export const SiteConfigEdit = () => {
  const { site: userSite } = useUserSite()
  const { canEditConfig, hasSite } = useCanManageSite()
  const { data: site, isLoading, error } = useSite(userSite?.documentId || '')
  const { mutate: updateSite, isPending } = useUpdateSite()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [activeSection, scrollToSection] = useActiveSection(SECTION_KEYS)

  const [formData, setFormData] = React.useState<SiteConfigFormData>({
    name: '',
    contact_mail: '',
    contact_phone: '',
    address: '',
    colors: '',
    siret: '',
    publication_director: '',
    publication_director_title: '',
    hebergeur_name: '',
    hebergeur_address: '',
    hebergeur_phone: '',
    credits: '',
    mentions_legales_extra: '',
    dpo_name: '',
    dpo_email: '',
    dpo_phone: '',
    rgpd_policy: '',
    accessibility_level: '',
    accessibility_declaration: '',
    accessibility_schema_url: '',
    accessibility_action_plan_url: '',
    opening_hours: '',
    population: '',
    contact_form_intro: '',
    open_data_enabled: false,
    open_data_url: '',
    open_data_platform: 'none',
    has_dispositif_recueil: false,
    appointment_url: '',
    appointment_provider: 'ants-rdv',
    remise_titre_info: '',
    auto_deploy_enabled: false,
    auto_deploy_delay: '300',
    homepage_content: '',
    homepage_meta_description: '',
    hero_title: '',
    hero_subtitle: '',
    hero_cta_primary_label: '',
    hero_cta_primary_url: '',
    hero_cta_secondary_label: '',
    hero_cta_secondary_url: '',
    show_quick_links: true,
    show_mayor_word: false,
    mayor_word_title: '',
    mayor_word_content: '',
    show_articles: true,
    articles_count: '3',
    show_events: true,
    events_count: '3',
    show_key_figures: false,
    show_associations: false,
    associations_count: '6',
    show_partners: false,
    latitude: '',
    longitude: '',
    show_weather: false,
    show_waste_collection: false,
    show_disruptions: false,
    show_newsletter: false,
    show_school_menu: false,
  })

  const [logoImage, setLogoImage] = React.useState<ImageData | null>(null)
  const [faviconImage, setFaviconImage] = React.useState<ImageData | null>(null)
  const [heroImage, setHeroImage] = React.useState<ImageData | null>(null)
  const [quickLinks, setQuickLinks] = React.useState<HomepageQuickLink[]>([])
  const [keyFigures, setKeyFigures] = React.useState<HomepageKeyFigure[]>([])
  const [partners, setPartners] = React.useState<HomepagePartner[]>([])
  const [navigationItems, setNavigationItems] = React.useState<NavigationItem[]>([])
  const [socialLinks, setSocialLinks] = React.useState<SocialLink[]>([])

  const { data: pagesData } = usePages({ status: 'published', pageSize: 100 })

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [_isDirty, setIsDirty] = React.useState(false)
  const [formInitialized, setFormInitialized] = React.useState(false)

  React.useEffect(() => {
    if (site) {
      setFormData({
        name: site.name,
        contact_mail: site.contact_mail,
        contact_phone: site.contact_phone || '',
        address: site.address || '',
        colors: site.colors ? JSON.stringify(site.colors, null, 2) : '',
        siret: site.mentions_legales?.siret || '',
        publication_director: site.mentions_legales?.publication_director || '',
        publication_director_title: site.mentions_legales?.publication_director_title || '',
        hebergeur_name: site.mentions_legales?.hebergeur_name || '',
        hebergeur_address: site.mentions_legales?.hebergeur_address || '',
        hebergeur_phone: site.mentions_legales?.hebergeur_phone || '',
        credits: site.mentions_legales?.credits || '',
        mentions_legales_extra: site.mentions_legales?.mentions_legales_extra || '',
        dpo_name: site.rgpd?.dpo_name || '',
        dpo_email: site.rgpd?.dpo_email || '',
        dpo_phone: site.rgpd?.dpo_phone || '',
        rgpd_policy: site.rgpd?.rgpd_policy || '',
        accessibility_level: site.accessibilite?.accessibility_level || '',
        accessibility_declaration: site.accessibilite?.accessibility_declaration || '',
        accessibility_schema_url: site.accessibilite?.accessibility_schema_url || '',
        accessibility_action_plan_url: site.accessibilite?.accessibility_action_plan_url || '',
        opening_hours: site.infos_pratiques?.opening_hours ? JSON.stringify(site.infos_pratiques.opening_hours, null, 2) : '',
        population: site.infos_pratiques?.population?.toString() || '',
        contact_form_intro: site.infos_pratiques?.contact_form_intro || '',
        open_data_enabled: site.open_data_enabled || false,
        open_data_url: site.open_data_url || '',
        open_data_platform: site.open_data_platform || 'none',
        has_dispositif_recueil: site.demarches_identite?.has_dispositif_recueil || false,
        appointment_url: site.demarches_identite?.appointment_url || '',
        appointment_provider: site.demarches_identite?.appointment_provider || 'ants-rdv',
        remise_titre_info: site.demarches_identite?.remise_titre_info || '',
        auto_deploy_enabled: site.auto_deploy_enabled || false,
        auto_deploy_delay: (site.auto_deploy_delay ?? 300).toString(),
        homepage_content: site.homepage?.content || '',
        homepage_meta_description: site.homepage?.meta_description || '',
        hero_title: site.homepage?.hero_title || '',
        hero_subtitle: site.homepage?.hero_subtitle || '',
        hero_cta_primary_label: site.homepage?.hero_cta_primary_label || '',
        hero_cta_primary_url: site.homepage?.hero_cta_primary_url || '',
        hero_cta_secondary_label: site.homepage?.hero_cta_secondary_label || '',
        hero_cta_secondary_url: site.homepage?.hero_cta_secondary_url || '',
        show_quick_links: site.homepage?.show_quick_links ?? true,
        show_mayor_word: site.homepage?.show_mayor_word ?? false,
        mayor_word_title: site.homepage?.mayor_word_title || '',
        mayor_word_content: site.homepage?.mayor_word_content || '',
        show_articles: site.homepage?.show_articles ?? true,
        articles_count: (site.homepage?.articles_count ?? 3).toString(),
        show_events: site.homepage?.show_events ?? true,
        events_count: (site.homepage?.events_count ?? 3).toString(),
        show_key_figures: site.homepage?.show_key_figures ?? false,
        show_associations: site.homepage?.show_associations ?? false,
        associations_count: (site.homepage?.associations_count ?? 6).toString(),
        show_partners: site.homepage?.show_partners ?? false,
        latitude: site.infos_pratiques?.latitude?.toString() || '',
        longitude: site.infos_pratiques?.longitude?.toString() || '',
        show_weather: site.homepage?.show_weather ?? false,
        show_waste_collection: site.homepage?.show_waste_collection ?? false,
        show_disruptions: site.homepage?.show_disruptions ?? false,
        show_newsletter: site.homepage?.show_newsletter ?? false,
        show_school_menu: site.homepage?.show_school_menu ?? false,
      })
      setLogoImage(site.logo ? { id: site.logo.id, documentId: '', name: '', url: site.logo.url, mime: 'image/png', size: 0, ext: '' } : null)
      setFaviconImage(site.favicon ? { id: site.favicon.id, documentId: '', name: '', url: site.favicon.url, mime: 'image/png', size: 0, ext: '' } : null)
      setHeroImage(site.homepage?.hero_image || null)
      setQuickLinks(site.homepage?.quick_links?.map(({ id: _id, ...rest }) => rest) || [])
      setKeyFigures(site.homepage?.key_figures?.map(({ id: _id, ...rest }) => rest) || [])
      setPartners(site.homepage?.partners?.map(({ id: _id, ...rest }) => rest) || [])
      setNavigationItems(site.navigation_config || [])
      setSocialLinks(site.social_links?.map(({ id: _id, ...rest }) => rest) || [])
      setFormInitialized(true)
    }
  }, [site])

  if (!hasSite) {
    return <ErrorState title="Site non trouvé" message="Aucun site associé à votre compte" />
  }

  if (!canEditConfig) {
    return (
      <ErrorState
        title="Accès refusé"
        message="Seuls les maires et adjoints peuvent modifier la configuration du site"
      />
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du site est requis'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Maximum 100 caractères'
    }

    if (!formData.contact_mail.trim()) {
      newErrors.contact_mail = 'L\'email de contact est requis'
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.contact_mail)) {
      newErrors.contact_mail = 'Format d\'email invalide'
    }

    if (formData.colors.trim()) {
      try {
        JSON.parse(formData.colors)
      } catch {
        newErrors.colors = 'Format JSON invalide'
      }
    }

    if (!formData.siret.trim()) {
      newErrors.siret = 'Le SIRET est requis'
    } else if (!/^\d{14}$/.test(formData.siret.replace(/\s/g, ''))) {
      newErrors.siret = 'Le SIRET doit contenir 14 chiffres'
    }

    if (!formData.publication_director.trim()) {
      newErrors.publication_director = 'Le directeur de publication est requis'
    }

    if (!formData.hebergeur_name.trim()) {
      newErrors.hebergeur_name = 'Le nom de l\'hébergeur est requis'
    }

    if (!formData.dpo_name.trim()) {
      newErrors.dpo_name = 'Le nom du DPO est requis'
    }

    if (!formData.dpo_email.trim()) {
      newErrors.dpo_email = 'L\'email du DPO est requis'
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.dpo_email)) {
      newErrors.dpo_email = 'Format d\'email invalide'
    }

    if (!formData.rgpd_policy || formData.rgpd_policy.replace(/<[^>]*>/g, '').trim().length < 50) {
      newErrors.rgpd_policy = 'La politique de confidentialité est requise (min. 50 caractères)'
    }

    if (!formData.accessibility_level) {
      newErrors.accessibility_level = 'Le niveau d\'accessibilité est requis'
    }

    if (formData.opening_hours.trim()) {
      try {
        JSON.parse(formData.opening_hours)
      } catch {
        newErrors.opening_hours = 'Format JSON invalide'
      }
    }

    if (formData.population && (isNaN(Number(formData.population)) || Number(formData.population) < 0)) {
      newErrors.population = 'La population doit être un nombre positif'
    }

    if (formData.latitude) {
      const lat = Number(formData.latitude)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = 'La latitude doit être entre -90 et 90'
      }
    }

    if (formData.longitude) {
      const lng = Number(formData.longitude)
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.longitude = 'La longitude doit être entre -180 et 180'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const sectionHasErrors = (sectionKey: string) => {
    const fields = SECTION_FIELDS[sectionKey] || []
    return fields.some(field => !!errors[field])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!site || !validateForm()) return

    let parsedColors = null
    if (formData.colors.trim()) {
      try {
        parsedColors = JSON.parse(formData.colors)
      } catch {
        return
      }
    }

    let parsedOpeningHours = null
    if (formData.opening_hours.trim()) {
      try {
        parsedOpeningHours = JSON.parse(formData.opening_hours)
      } catch {
        return
      }
    }

    const updateData: UpdateSiteData = {
      documentId: site.documentId,
      name: formData.name,
      contact_mail: formData.contact_mail,
      contact_phone: formData.contact_phone || undefined,
      address: formData.address || undefined,
      colors: parsedColors,
      logo: logoImage?.id || undefined,
      favicon: faviconImage?.id || undefined,
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
      rgpd: {
        dpo_name: formData.dpo_name || undefined,
        dpo_email: formData.dpo_email || undefined,
        dpo_phone: formData.dpo_phone || undefined,
        rgpd_policy: formData.rgpd_policy || undefined,
      },
      accessibilite: {
        accessibility_level: formData.accessibility_level || undefined,
        accessibility_declaration: formData.accessibility_declaration || undefined,
        accessibility_schema_url: formData.accessibility_schema_url || undefined,
        accessibility_action_plan_url: formData.accessibility_action_plan_url || undefined,
      },
      infos_pratiques: {
        opening_hours: parsedOpeningHours,
        population: formData.population ? Number(formData.population) : undefined,
        contact_form_intro: formData.contact_form_intro || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      },
      open_data_enabled: formData.open_data_enabled,
      open_data_url: formData.open_data_url || undefined,
      open_data_platform: formData.open_data_platform,
      demarches_identite: {
        has_dispositif_recueil: formData.has_dispositif_recueil,
        appointment_url: formData.appointment_url || undefined,
        appointment_provider: formData.appointment_provider,
        remise_titre_info: formData.remise_titre_info || undefined,
      },
      auto_deploy_enabled: formData.auto_deploy_enabled,
      auto_deploy_delay: Number(formData.auto_deploy_delay) || 300,
      navigation_config: navigationItems.length > 0 ? navigationItems : undefined,
      social_links: socialLinks.map(({ id: _id, icon, ...rest }) => ({
        ...rest,
        icon: icon?.id ? icon.id : undefined,
      })),
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
      } as any,
    }

    updateSite(updateData, {
      onSuccess: () => {
        toaster.create({
          title: 'Configuration mise à jour',
          description: 'La configuration du site a été mise à jour avec succès.',
          type: 'success',
          duration: 3000,
        })
        navigate('/site')
      },
      onError: () => {
        toaster.create({
          title: 'Erreur lors de la sauvegarde',
          description: 'Une erreur est survenue lors de la sauvegarde de la configuration.',
          type: 'error',
          duration: 5000,
        })
      }
    })
  }

  const handleCancel = () => {
    navigate('/site')
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState title="Erreur de chargement" message="Impossible de charger la configuration du site" />
  if (!site) return <ErrorState title="Site non trouvé" message="Aucune configuration de site disponible" />
  if (!formInitialized) return <LoadingSpinner />

  const baseProps = { formData, onFieldChange: handleInputChange, errors, setIsDirty, setFormData }
  const pages = pagesData?.data || []

  const renderSection = (key: string) => {
    switch (key) {
      case 'general':
        return <GeneralSection {...baseProps} siteSlug={site.slug} logoImage={logoImage} setLogoImage={setLogoImage} faviconImage={faviconImage} setFaviconImage={setFaviconImage} />
      case 'legal':
        return <LegalSection {...baseProps} />
      case 'rgpd':
        return <RgpdSection {...baseProps} />
      case 'accessibility':
        return <AccessibilitySection {...baseProps} />
      case 'info':
        return <InfoSection {...baseProps} />
      case 'opendata':
        return <OpenDataSection {...baseProps} />
      case 'demarches':
        return <DemarchesSection {...baseProps} />
      case 'homepage':
        return <HomepageSection {...baseProps} heroImage={heroImage} setHeroImage={setHeroImage} quickLinks={quickLinks} setQuickLinks={setQuickLinks} keyFigures={keyFigures} setKeyFigures={setKeyFigures} partners={partners} setPartners={setPartners} />
      case 'navigation':
        return <NavigationSection navigationItems={navigationItems} setNavigationItems={setNavigationItems} setIsDirty={setIsDirty} pages={pages} />
      case 'social':
        return <SocialSection socialLinks={socialLinks} setSocialLinks={setSocialLinks} setIsDirty={setIsDirty} />
      default:
        return null
    }
  }

  return (
    <div className="mx-auto w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Modifier la configuration"
            subtitle="Paramètres du site"
            breadcrumbs={[
              { label: 'Site', href: '/site' },
              { label: 'Modifier' },
            ]}
            actions={[
              {
                label: "Annuler",
                onClick: handleCancel,
                variant: "ghost"
              },
              {
                label: isPending ? "Sauvegarde..." : "Sauvegarder",
                onClick: () => {
                  const form = document.querySelector('form') as HTMLFormElement
                  if (form) form.requestSubmit()
                },
                colorScheme: "blue",
                loading: isPending
              }
            ]}
          />

          {isMobile ? (
            <SiteConfigMobileNav
              sections={SECTIONS}
              sectionHasErrors={sectionHasErrors}
              renderSection={renderSection}
            />
          ) : (
            <div className="flex gap-6">
              <SiteConfigNav
                sections={SECTIONS}
                activeSection={activeSection}
                sectionHasErrors={sectionHasErrors}
                onSectionClick={scrollToSection}
              />
              <div className="flex-1 flex flex-col gap-6">
                {SECTIONS.map(s => (
                  <React.Fragment key={s.key}>
                    {renderSection(s.key)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4">
            <Button variant="ghost" type="button" onClick={handleCancel} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
