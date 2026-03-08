import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { InfoSection } from '../../components/site-config'
import { validateInfo } from '../../components/site-config/validation'
import { buildInfoPayload } from '../../components/site-config/payloads'
import { useSectionForm } from '../../hooks/useSectionForm'
import type { Site } from '../../hooks/api/useSites'

function initInfo(site: Site) {
  return {
    opening_hours: site.infos_pratiques?.opening_hours ? JSON.stringify(site.infos_pratiques.opening_hours, null, 2) : '',
    population: site.infos_pratiques?.population?.toString() || '',
    contact_form_intro: site.infos_pratiques?.contact_form_intro || '',
    latitude: site.infos_pratiques?.latitude?.toString() || '',
    longitude: site.infos_pratiques?.longitude?.toString() || '',
  }
}

export function InfoSectionPage() {
  const { formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset } = useSectionForm({
    initializer: initInfo,
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateInfo(formData)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    handleSubmit(buildInfoPayload(formData))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <InfoSection formData={formData} onFieldChange={handleFieldChange} errors={errors} setIsDirty={setIsDirty} setFormData={setFormData} />
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
