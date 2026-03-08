import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { HomepageSection } from '../../components/site-config'
import type { ImageData } from '../../components/site-config/types'
import { validateHomepage } from '../../components/site-config/validation'
import { buildHomepagePayload } from '../../components/site-config/payloads'
import { useSectionForm } from '../../hooks/useSectionForm'
import type { Site, HomepageQuickLink, HomepageKeyFigure, HomepagePartner } from '../../hooks/api/useSites'

function initHomepage(site: Site) {
  return {
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
    show_weather: site.homepage?.show_weather ?? false,
    show_waste_collection: site.homepage?.show_waste_collection ?? false,
    show_disruptions: site.homepage?.show_disruptions ?? false,
    show_newsletter: site.homepage?.show_newsletter ?? false,
    show_school_menu: site.homepage?.show_school_menu ?? false,
  }
}

export function HomepageSectionPage() {
  const { site, formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset } = useSectionForm({
    initializer: initHomepage,
  })

  const [heroImage, setHeroImage] = React.useState<ImageData | null>(site.homepage?.hero_image || null)
  const [quickLinks, setQuickLinks] = React.useState<HomepageQuickLink[]>(
    site.homepage?.quick_links?.map(({ id: _id, ...rest }) => rest) || []
  )
  const [keyFigures, setKeyFigures] = React.useState<HomepageKeyFigure[]>(
    site.homepage?.key_figures?.map(({ id: _id, ...rest }) => rest) || []
  )
  const [partners, setPartners] = React.useState<HomepagePartner[]>(
    site.homepage?.partners?.map(({ id: _id, ...rest }) => rest) || []
  )

  React.useEffect(() => {
    setHeroImage(site.homepage?.hero_image || null)
    setQuickLinks(site.homepage?.quick_links?.map(({ id: _id, ...rest }) => rest) || [])
    setKeyFigures(site.homepage?.key_figures?.map(({ id: _id, ...rest }) => rest) || [])
    setPartners(site.homepage?.partners?.map(({ id: _id, ...rest }) => rest) || [])
  }, [site])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateHomepage()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    handleSubmit(buildHomepagePayload(formData, heroImage, quickLinks, keyFigures, partners))
  }

  const onReset = () => {
    handleReset()
    setHeroImage(site.homepage?.hero_image || null)
    setQuickLinks(site.homepage?.quick_links?.map(({ id: _id, ...rest }) => rest) || [])
    setKeyFigures(site.homepage?.key_figures?.map(({ id: _id, ...rest }) => rest) || [])
    setPartners(site.homepage?.partners?.map(({ id: _id, ...rest }) => rest) || [])
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <HomepageSection
        formData={formData} onFieldChange={handleFieldChange} errors={errors}
        setIsDirty={setIsDirty} setFormData={setFormData}
        heroImage={heroImage} setHeroImage={setHeroImage}
        quickLinks={quickLinks} setQuickLinks={setQuickLinks}
        keyFigures={keyFigures} setKeyFigures={setKeyFigures}
        partners={partners} setPartners={setPartners}
      />
      <div className="flex justify-end gap-4">
        <Button variant="ghost" type="button" onClick={onReset} disabled={isPending || !isDirty}>Annuler</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Sauvegarde...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
