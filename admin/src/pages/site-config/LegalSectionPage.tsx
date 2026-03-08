import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { LegalSection } from '../../components/site-config'
import { validateLegal } from '../../components/site-config/validation'
import { buildLegalPayload } from '../../components/site-config/payloads'
import { useSectionForm } from '../../hooks/useSectionForm'
import type { Site } from '../../hooks/api/useSites'

function initLegal(site: Site) {
  return {
    siret: site.mentions_legales?.siret || '',
    publication_director: site.mentions_legales?.publication_director || '',
    publication_director_title: site.mentions_legales?.publication_director_title || '',
    hebergeur_name: site.mentions_legales?.hebergeur_name || '',
    hebergeur_address: site.mentions_legales?.hebergeur_address || '',
    hebergeur_phone: site.mentions_legales?.hebergeur_phone || '',
    credits: site.mentions_legales?.credits || '',
    mentions_legales_extra: site.mentions_legales?.mentions_legales_extra || '',
  }
}

export function LegalSectionPage() {
  const { formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset } = useSectionForm({
    initializer: initLegal,
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateLegal(formData)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    handleSubmit(buildLegalPayload(formData))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <LegalSection formData={formData} onFieldChange={handleFieldChange} errors={errors} setIsDirty={setIsDirty} setFormData={setFormData} />
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
