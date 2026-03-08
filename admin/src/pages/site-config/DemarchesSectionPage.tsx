import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { DemarchesSection } from '../../components/site-config'
import { validateDemarches } from '../../components/site-config/validation'
import { buildDemarchesPayload } from '../../components/site-config/payloads'
import { useSectionForm } from '../../hooks/useSectionForm'
import type { SiteConfigFormData } from '../../components/site-config/types'
import type { Site } from '../../hooks/api/useSites'

function initDemarches(site: Site): Partial<SiteConfigFormData> {
  return {
    has_dispositif_recueil: site.demarches_identite?.has_dispositif_recueil || false,
    appointment_url: site.demarches_identite?.appointment_url || '',
    appointment_provider: site.demarches_identite?.appointment_provider || 'ants-rdv',
    remise_titre_info: site.demarches_identite?.remise_titre_info || '',
  }
}

export function DemarchesSectionPage() {
  const { formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset } = useSectionForm({
    initializer: initDemarches,
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateDemarches()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    handleSubmit(buildDemarchesPayload(formData))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <DemarchesSection formData={formData} onFieldChange={handleFieldChange} errors={errors} setIsDirty={setIsDirty} setFormData={setFormData} />
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
