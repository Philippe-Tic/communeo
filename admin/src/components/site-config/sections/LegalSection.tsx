import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '../../editor'
import type { SectionBaseProps } from '../types'

export function LegalSection({
  formData,
  onFieldChange,
  errors,
}: SectionBaseProps) {
  return (
    <div id="section-legal">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Mentions légales
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2">SIRET <span className="text-destructive">*</span></Label>
              <Input
                value={formData.siret}
                onChange={(e) => onFieldChange('siret', e.target.value)}
                placeholder="Ex: 123 456 789 00012"
                className={errors.siret ? 'border-destructive' : ''}
              />
              {errors.siret && (
                <p className="mt-1 text-sm text-destructive">{errors.siret}</p>
              )}
            </div>

            <div>
              <Label className="mb-2">Directeur de publication <span className="text-destructive">*</span></Label>
              <Input
                value={formData.publication_director}
                onChange={(e) => onFieldChange('publication_director', e.target.value)}
                placeholder="Nom du directeur de publication"
                className={errors.publication_director ? 'border-destructive' : ''}
              />
              {errors.publication_director && (
                <p className="mt-1 text-sm text-destructive">{errors.publication_director}</p>
              )}
            </div>

            <div>
              <Label className="mb-2">Titre du directeur de publication</Label>
              <Input
                value={formData.publication_director_title}
                onChange={(e) => onFieldChange('publication_director_title', e.target.value)}
                placeholder="Ex: Maire"
              />
            </div>

            <div>
              <Label className="mb-2">Nom de l'hébergeur <span className="text-destructive">*</span></Label>
              <Input
                value={formData.hebergeur_name}
                onChange={(e) => onFieldChange('hebergeur_name', e.target.value)}
                placeholder="Ex: Netlify, OVH..."
                className={errors.hebergeur_name ? 'border-destructive' : ''}
              />
              {errors.hebergeur_name && (
                <p className="mt-1 text-sm text-destructive">{errors.hebergeur_name}</p>
              )}
            </div>

            <div>
              <Label className="mb-2">Adresse de l'hébergeur</Label>
              <Input
                value={formData.hebergeur_address}
                onChange={(e) => onFieldChange('hebergeur_address', e.target.value)}
                placeholder="Adresse de l'hébergeur"
              />
            </div>

            <div>
              <Label className="mb-2">Téléphone de l'hébergeur</Label>
              <Input
                type="tel"
                value={formData.hebergeur_phone}
                onChange={(e) => onFieldChange('hebergeur_phone', e.target.value)}
                placeholder="Téléphone de l'hébergeur"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6 pt-2">
            <div>
              <Label className="mb-2">Crédits</Label>
              <RichTextEditor
                value={formData.credits}
                onChange={(value) => onFieldChange('credits', value)}
                placeholder="Crédits photos, conception..."
              />
            </div>

            <div>
              <Label className="mb-2">Mentions légales supplémentaires</Label>
              <RichTextEditor
                value={formData.mentions_legales_extra}
                onChange={(value) => onFieldChange('mentions_legales_extra', value)}
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
