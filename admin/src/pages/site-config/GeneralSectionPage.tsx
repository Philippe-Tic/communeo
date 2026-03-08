import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { GeneralSection } from '../../components/site-config'
import type { ImageData } from '../../components/site-config/types'
import { validateGeneral } from '../../components/site-config/validation'
import { buildGeneralPayload } from '../../components/site-config/payloads'
import { useSectionForm } from '../../hooks/useSectionForm'
import type { Site } from '../../hooks/api/useSites'

function initGeneral(site: Site) {
  return {
    name: site.name,
    contact_mail: site.contact_mail,
    contact_phone: site.contact_phone || '',
    address: site.address || '',
    colors: site.colors ? JSON.stringify(site.colors, null, 2) : '',
    auto_deploy_enabled: site.auto_deploy_enabled || false,
    auto_deploy_delay: (site.auto_deploy_delay ?? 300).toString(),
  }
}

export function GeneralSectionPage() {
  const { site, formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset } = useSectionForm({
    initializer: initGeneral,
  })

  const [logoImage, setLogoImage] = React.useState<ImageData | null>(
    site.logo ? { id: site.logo.id, documentId: '', name: '', url: site.logo.url, mime: 'image/png', size: 0, ext: '' } : null
  )
  const [faviconImage, setFaviconImage] = React.useState<ImageData | null>(
    site.favicon ? { id: site.favicon.id, documentId: '', name: '', url: site.favicon.url, mime: 'image/png', size: 0, ext: '' } : null
  )

  React.useEffect(() => {
    setLogoImage(site.logo ? { id: site.logo.id, documentId: '', name: '', url: site.logo.url, mime: 'image/png', size: 0, ext: '' } : null)
    setFaviconImage(site.favicon ? { id: site.favicon.id, documentId: '', name: '', url: site.favicon.url, mime: 'image/png', size: 0, ext: '' } : null)
  }, [site])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateGeneral(formData)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    handleSubmit(buildGeneralPayload(formData, logoImage, faviconImage))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <GeneralSection
        formData={formData} onFieldChange={handleFieldChange} errors={errors}
        setIsDirty={setIsDirty} setFormData={setFormData}
        siteSlug={site.slug} logoImage={logoImage} setLogoImage={setLogoImage}
        faviconImage={faviconImage} setFaviconImage={setFaviconImage}
      />
      <div className="flex justify-end gap-4">
        <Button variant="ghost" type="button" onClick={handleReset} disabled={isPending || !isDirty}>Annuler</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Sauvegarde...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
