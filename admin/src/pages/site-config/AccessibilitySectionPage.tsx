import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { AccessibilitySection } from '../../components/site-config'
import { validateAccessibility } from '../../components/site-config/validation'
import { buildAccessibilityPayload } from '../../components/site-config/payloads'
import { useSectionForm } from '../../hooks/useSectionForm'
import type { Site } from '../../hooks/api/useSites'

function initAccessibility(site: Site) {
  return {
    accessibility_level: site.accessibilite?.accessibility_level || '' as const,
    accessibility_declaration: site.accessibilite?.accessibility_declaration || '',
    accessibility_schema_url: site.accessibilite?.accessibility_schema_url || '',
    accessibility_action_plan_url: site.accessibilite?.accessibility_action_plan_url || '',
  }
}

export function AccessibilitySectionPage() {
  const { formData, setFormData, handleFieldChange, errors, setErrors, isDirty, setIsDirty, isPending, handleSubmit, handleReset } = useSectionForm({
    initializer: initAccessibility,
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validateAccessibility(formData)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    handleSubmit(buildAccessibilityPayload(formData))
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <AccessibilitySection formData={formData} onFieldChange={handleFieldChange} errors={errors} setIsDirty={setIsDirty} setFormData={setFormData} />
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
