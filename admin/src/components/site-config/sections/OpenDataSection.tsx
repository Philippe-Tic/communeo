import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormSelect } from '../../forms/FormSelect'
import type { SectionBaseProps } from '../types'

export function OpenDataSection({
  formData,
  onFieldChange,
  setIsDirty,
  setFormData,
}: SectionBaseProps) {
  return (
    <div id="section-opendata">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Open Data
          </h2>
          <p className="text-sm text-muted-foreground">
            Les communes de plus de 3 500 habitants ont l'obligation de publier certaines données en open data (Art. L312-1-1 CRPA).
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={formData.open_data_enabled}
              onClick={() => {
                setFormData(prev => ({ ...prev, open_data_enabled: !prev.open_data_enabled }))
                setIsDirty(true)
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                formData.open_data_enabled ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  formData.open_data_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <Label>Activer la page Open Data sur le site public</Label>
          </div>

          {formData.open_data_enabled && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormSelect
                label="Plateforme Open Data"
                value={formData.open_data_platform}
                onValueChange={(v) => onFieldChange('open_data_platform', v)}
                options={[
                  { value: 'none', label: 'Aucune' },
                  { value: 'data-gouv-fr', label: 'data.gouv.fr' },
                  { value: 'opendatasoft', label: 'OpenDataSoft' },
                  { value: 'custom', label: 'Autre plateforme' },
                ]}
                description="Plateforme sur laquelle vos données sont publiées"
              />

              <div>
                <Label className="mb-2">URL du portail Open Data</Label>
                <Input
                  type="url"
                  value={formData.open_data_url}
                  onChange={(e) => onFieldChange('open_data_url', e.target.value)}
                  placeholder="https://www.data.gouv.fr/fr/organizations/..."
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Lien direct vers votre page sur la plateforme choisie
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
