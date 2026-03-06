import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormSelect } from '../../forms/FormSelect'
import type { SectionBaseProps } from '../types'

export function DemarchesSection({
  formData,
  onFieldChange,
  errors,
  setIsDirty,
  setFormData,
}: SectionBaseProps) {
  return (
    <div id="section-demarches">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Démarches CNI & Passeport
          </h2>
          <p className="text-sm text-muted-foreground">
            Si votre mairie dispose d'un dispositif de recueil biométrique, activez cette option pour afficher une section dédiée sur la page Démarches du site public.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={formData.has_dispositif_recueil}
              onClick={() => {
                setFormData(prev => ({ ...prev, has_dispositif_recueil: !prev.has_dispositif_recueil }))
                setIsDirty(true)
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                formData.has_dispositif_recueil ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  formData.has_dispositif_recueil ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <Label>Votre mairie dispose d'un dispositif de recueil biométrique</Label>
          </div>

          {formData.has_dispositif_recueil && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormSelect
                  label="Plateforme de rendez-vous"
                  value={formData.appointment_provider}
                  onValueChange={(v) => onFieldChange('appointment_provider', v)}
                  options={[
                    { value: 'ants-rdv', label: 'ANTS RDV' },
                    { value: 'synbird', label: 'Synbird' },
                    { value: 'rdv-service-public', label: 'rdv-service-public.fr' },
                    { value: 'autre', label: 'Autre' },
                  ]}
                  description="Service utilisé pour la prise de rendez-vous en ligne"
                />

                <div>
                  <Label className="mb-2">URL de prise de rendez-vous</Label>
                  <Input
                    type="url"
                    value={formData.appointment_url}
                    onChange={(e) => onFieldChange('appointment_url', e.target.value)}
                    placeholder="https://www.rdv-service-public.fr/..."
                    className={errors.appointment_url ? 'border-destructive' : ''}
                  />
                  {errors.appointment_url && (
                    <p className="mt-1 text-sm text-destructive">{errors.appointment_url}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    Lien direct vers la page de prise de rendez-vous
                  </p>
                </div>
              </div>

              <div>
                <Label className="mb-2">Informations sur la remise du titre</Label>
                <Textarea
                  value={formData.remise_titre_info}
                  onChange={(e) => onFieldChange('remise_titre_info', e.target.value)}
                  placeholder="Ex: Le retrait du titre s'effectue en mairie sur rendez-vous, muni d'une pièce d'identité..."
                  rows={4}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Texte personnalisé affiché dans la section infos pratiques de la page Démarches
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
