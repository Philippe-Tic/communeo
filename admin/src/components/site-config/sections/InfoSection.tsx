import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OpeningHoursEditor } from '../opening-hours'
import type { SectionBaseProps } from '../types'

export function InfoSection({
  formData,
  onFieldChange,
  errors,
  setIsDirty,
}: SectionBaseProps) {
  return (
    <div id="section-info">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Informations pratiques
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2">Population</Label>
              <Input
                type="number"
                min="0"
                value={formData.population}
                onChange={(e) => onFieldChange('population', e.target.value)}
                placeholder="Nombre d'habitants"
                className={errors.population ? 'border-destructive' : ''}
              />
              {errors.population && (
                <p className="mt-1 text-sm text-destructive">{errors.population}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2">Latitude</Label>
              <Input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => onFieldChange('latitude', e.target.value)}
                placeholder="Ex: 45.764"
                className={errors.latitude ? 'border-destructive' : ''}
              />
              {errors.latitude && (
                <p className="mt-1 text-sm text-destructive">{errors.latitude}</p>
              )}
            </div>
            <div>
              <Label className="mb-2">Longitude</Label>
              <Input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => onFieldChange('longitude', e.target.value)}
                placeholder="Ex: 4.8357"
                className={errors.longitude ? 'border-destructive' : ''}
              />
              {errors.longitude && (
                <p className="mt-1 text-sm text-destructive">{errors.longitude}</p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Coordonnées GPS de la commune (utilisées pour le widget météo).
          </p>

          <div>
            <Label className="mb-2">Texte d'introduction de la page Contact</Label>
            <Textarea
              value={formData.contact_form_intro}
              onChange={(e) => onFieldChange('contact_form_intro', e.target.value)}
              placeholder="Vous pouvez nous contacter en utilisant le formulaire ci-dessous..."
              rows={4}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Affiché au-dessus du formulaire sur la page /contact
            </p>
          </div>

          <OpeningHoursEditor
            value={formData.opening_hours}
            onChange={(val) => onFieldChange('opening_hours', val)}
            error={errors.opening_hours}
            setIsDirty={setIsDirty}
          />
        </div>
      </div>
    </div>
  )
}
