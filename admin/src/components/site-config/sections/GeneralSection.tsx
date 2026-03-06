import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImagePicker } from '../../forms/ImagePicker'
import { ThemeColorPicker } from '../ThemeColorPicker'
import type { GeneralSectionProps } from '../types'

export function GeneralSection({
  formData,
  onFieldChange,
  errors,
  setIsDirty,
  setFormData,
  siteSlug,
  logoImage,
  setLogoImage,
  faviconImage,
  setFaviconImage,
}: GeneralSectionProps) {
  return (
    <div id="section-general" className="flex flex-col gap-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Informations générales
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2">Nom du site <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => onFieldChange('name', e.target.value)}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div>
              <Label className="mb-2">Slug</Label>
              <Input
                value={siteSlug}
                disabled
                className="bg-muted"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Le slug ne peut pas être modifié
              </p>
            </div>

            <div>
              <Label className="mb-2">Email de contact <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={formData.contact_mail}
                onChange={(e) => onFieldChange('contact_mail', e.target.value)}
                className={errors.contact_mail ? 'border-destructive' : ''}
              />
              {errors.contact_mail && (
                <p className="mt-1 text-sm text-destructive">{errors.contact_mail}</p>
              )}
            </div>

            <div>
              <Label className="mb-2">Téléphone</Label>
              <Input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => onFieldChange('contact_phone', e.target.value)}
                placeholder="Ex: 01 23 45 67 89"
              />
            </div>

            <div>
              <Label className="mb-2">Adresse</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => onFieldChange('address', e.target.value)}
                placeholder="Adresse complète de la mairie"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Identité visuelle
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2">Logo</Label>
              <ImagePicker
                value={logoImage}
                onChange={(media) => { setLogoImage(media); setIsDirty(true) }}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Logo affiché dans le header du site public
              </p>
            </div>
            <div>
              <Label className="mb-2">Favicon</Label>
              <ImagePicker
                value={faviconImage}
                onChange={(media) => { setFaviconImage(media); setIsDirty(true) }}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Image carrée recommandée (512x512px minimum). Utilisé comme icône du navigateur et PWA. Si absent, le logo sera utilisé.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Configuration des couleurs
          </h2>
          <ThemeColorPicker
            value={formData.colors}
            onChange={(value) => onFieldChange('colors', value)}
            error={errors.colors}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Déploiement automatique
          </h2>
          <p className="text-sm text-muted-foreground">
            Déclenche automatiquement un rebuild du site public lorsque du contenu est modifié (articles, pages, événements, documents, alertes).
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={formData.auto_deploy_enabled}
              onClick={() => {
                setFormData(prev => ({ ...prev, auto_deploy_enabled: !prev.auto_deploy_enabled }))
                setIsDirty(true)
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                formData.auto_deploy_enabled ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  formData.auto_deploy_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <Label>Activer le déploiement automatique</Label>
          </div>

          {formData.auto_deploy_enabled && (
            <div className="max-w-xs">
              <Label className="mb-2">Délai avant déploiement (secondes)</Label>
              <Input
                type="number"
                min={60}
                max={3600}
                value={formData.auto_deploy_delay}
                onChange={(e) => onFieldChange('auto_deploy_delay', e.target.value)}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Temps d'attente après la dernière modification avant de lancer le rebuild (60 à 3600 secondes)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
