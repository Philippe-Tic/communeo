import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { RgpdSection } from '../../components/site-config'
import { validateRgpd } from '../../components/site-config/validation'
import { buildRgpdPayload } from '../../components/site-config/payloads'
import { useSectionForm } from '../../hooks/useSectionForm'
import type { Site } from '../../hooks/api/useSites'

function initRgpd(site: Site) {
  return {
    dpo_name: site.rgpd?.dpo_name || '',
    dpo_email: site.rgpd?.dpo_email || '',
    dpo_phone: site.rgpd?.dpo_phone || '',
    rgpd_policy: site.rgpd?.rgpd_policy || '',
  }
}

export function RgpdSectionPage() {
  const { formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset } = useSectionForm({
    initializer: initRgpd,
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateRgpd(formData)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    handleSubmit(buildRgpdPayload(formData))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <RgpdSection formData={formData} onFieldChange={handleFieldChange} errors={errors} setIsDirty={setIsDirty} setFormData={setFormData} />
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
