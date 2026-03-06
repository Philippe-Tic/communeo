import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSelect } from '../../forms/FormSelect'
import { RichTextEditor } from '../../editor'
import type { SectionBaseProps } from '../types'

export function AccessibilitySection({
  formData,
  onFieldChange,
  errors,
}: SectionBaseProps) {
  return (
    <div id="section-accessibility">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Accessibilité
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormSelect
              label="Niveau de conformité"
              value={formData.accessibility_level || ''}
              onValueChange={(v) => onFieldChange('accessibility_level', v)}
              options={[
                { value: 'non-conforme', label: 'Non conforme' },
                { value: 'partiellement-conforme', label: 'Partiellement conforme' },
                { value: 'conforme', label: 'Conforme' },
              ]}
              placeholder="— Sélectionner —"
              required
              error={errors.accessibility_level}
            />

            <div>
              <Label className="mb-2">URL du schéma pluriannuel</Label>
              <Input
                type="url"
                value={formData.accessibility_schema_url}
                onChange={(e) => onFieldChange('accessibility_schema_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label className="mb-2">URL du plan d'action</Label>
              <Input
                type="url"
                value={formData.accessibility_action_plan_url}
                onChange={(e) => onFieldChange('accessibility_action_plan_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="pt-2">
            <Label className="mb-2">Déclaration d'accessibilité</Label>
            <RichTextEditor
              value={formData.accessibility_declaration}
              onChange={(value) => onFieldChange('accessibility_declaration', value)}
              placeholder="Déclaration d'accessibilité du site..."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
