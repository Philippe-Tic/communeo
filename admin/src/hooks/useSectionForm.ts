import React from 'react'
import { useOutletContext } from 'react-router-dom'
import { useUpdateSite, type Site } from './api/useSites'
import { toaster } from '../lib/toaster'
import type { SiteConfigFormData } from '../components/site-config/types'

export const DEFAULT_FORM_DATA: SiteConfigFormData = {
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
  code_insee: '',
  comarquage_enabled: false,
  comarquage_audiences_particuliers: true,
  comarquage_audiences_professionnels: false,
}

export interface SiteConfigOutletContext {
  site: Site
}

interface UseSectionFormOptions {
  initializer: (site: Site) => Partial<SiteConfigFormData>
}

export function useSectionForm({ initializer }: UseSectionFormOptions) {
  const { site } = useOutletContext<SiteConfigOutletContext>()
  const { mutate: updateSite, isPending } = useUpdateSite()

  const initializerRef = React.useRef(initializer)
  initializerRef.current = initializer

  const [formData, setFormData] = React.useState<SiteConfigFormData>(() => ({
    ...DEFAULT_FORM_DATA,
    ...initializer(site),
  }))

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = React.useState(false)

  React.useEffect(() => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      ...initializerRef.current(site),
    })
    setIsDirty(false)
  }, [site])

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSubmit = (payloadData: Record<string, unknown>) => {
    updateSite(
      { documentId: site.documentId, ...payloadData } as any,
      {
        onSuccess: () => {
          toaster.create({
            title: 'Section mise à jour',
            description: 'Les modifications ont été enregistrées.',
            type: 'success',
            duration: 3000,
          })
          setIsDirty(false)
        },
        onError: () => {
          toaster.create({
            title: 'Erreur de sauvegarde',
            description: 'Une erreur est survenue lors de la sauvegarde.',
            type: 'error',
            duration: 5000,
          })
        },
      }
    )
  }

  const handleReset = () => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      ...initializerRef.current(site),
    })
    setErrors({})
    setIsDirty(false)
  }

  return { site, formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset }
}
