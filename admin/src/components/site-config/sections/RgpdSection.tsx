import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wand2 } from 'lucide-react'
import { RichTextEditor } from '../../editor'
import { RGPD_TEMPLATE } from '../constants'
import type { SectionBaseProps } from '../types'

export function RgpdSection({
  formData,
  onFieldChange,
  errors,
}: SectionBaseProps) {
  return (
    <div id="section-rgpd">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            RGPD & Confidentialité
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2">Nom du DPO <span className="text-destructive">*</span></Label>
              <Input
                value={formData.dpo_name}
                onChange={(e) => onFieldChange('dpo_name', e.target.value)}
                placeholder="Délégué à la protection des données"
                className={errors.dpo_name ? 'border-destructive' : ''}
              />
              {errors.dpo_name && (
                <p className="mt-1 text-sm text-destructive">{errors.dpo_name}</p>
              )}
            </div>

            <div>
              <Label className="mb-2">Email du DPO <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={formData.dpo_email}
                onChange={(e) => onFieldChange('dpo_email', e.target.value)}
                placeholder="dpo@mairie.fr"
                className={errors.dpo_email ? 'border-destructive' : ''}
              />
              {errors.dpo_email && (
                <p className="mt-1 text-sm text-destructive">{errors.dpo_email}</p>
              )}
            </div>

            <div>
              <Label className="mb-2">Téléphone du DPO</Label>
              <Input
                type="tel"
                value={formData.dpo_phone}
                onChange={(e) => onFieldChange('dpo_phone', e.target.value)}
                placeholder="Téléphone du DPO"
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>Politique de confidentialité <span className="text-destructive">*</span></Label>
              {!formData.rgpd_policy && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onFieldChange('rgpd_policy', RGPD_TEMPLATE)
                  }}
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  Charger le modèle
                </Button>
              )}
            </div>
            <RichTextEditor
              value={formData.rgpd_policy}
              onChange={(value) => onFieldChange('rgpd_policy', value)}
              placeholder="Décrivez votre politique de confidentialité..."
            />
            {errors.rgpd_policy && (
              <p className="mt-1 text-sm text-destructive">{errors.rgpd_policy}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
