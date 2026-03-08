import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { OpenDataSection } from '../../components/site-config'
import { validateOpenData } from '../../components/site-config/validation'
import { buildOpenDataPayload } from '../../components/site-config/payloads'
import { useSectionForm } from '../../hooks/useSectionForm'
import type { SiteConfigFormData } from '../../components/site-config/types'
import type { Site } from '../../hooks/api/useSites'

function initOpenData(site: Site): Partial<SiteConfigFormData> {
  return {
    open_data_enabled: site.open_data_enabled || false,
    open_data_url: site.open_data_url || '',
    open_data_platform: site.open_data_platform || 'none',
  }
}

export function OpenDataSectionPage() {
  const { formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset } = useSectionForm({
    initializer: initOpenData,
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateOpenData()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    handleSubmit(buildOpenDataPayload(formData))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <OpenDataSection formData={formData} onFieldChange={handleFieldChange} errors={errors} setIsDirty={setIsDirty} setFormData={setFormData} />
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
