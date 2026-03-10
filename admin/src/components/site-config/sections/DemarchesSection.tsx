import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import apiClient from '../../../services/apiClient'
import type { SectionBaseProps } from '../types'

export function DemarchesSection({
  formData,
  onFieldChange,
  errors,
  setIsDirty,
  setFormData,
}: SectionBaseProps) {
  const [communeName, setCommuneName] = React.useState<string | null>(null)
  const [communeLoading, setCommuneLoading] = React.useState(false)
  const [communeError, setCommuneError] = React.useState<string | null>(null)
  const [cacheInvalidating, setCacheInvalidating] = React.useState(false)

  // Lookup commune name from code INSEE via geo.api.gouv.fr
  React.useEffect(() => {
    const code = formData.code_insee
    if (!code || !/^[0-9]{5}$/.test(code)) {
      setCommuneName(null)
      setCommuneError(null)
      return
    }

    setCommuneLoading(true)
    setCommuneError(null)

    const controller = new AbortController()
    fetch(`https://geo.api.gouv.fr/communes/${code}?fields=nom`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Commune introuvable')
        return res.json()
      })
      .then(data => {
        setCommuneName(data.nom)
        setCommuneLoading(false)
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setCommuneName(null)
          setCommuneError('Code INSEE introuvable')
          setCommuneLoading(false)
        }
      })

    return () => controller.abort()
  }, [formData.code_insee])

  const handleInvalidateCache = async () => {
    setCacheInvalidating(true)
    try {
      await apiClient.post('/comarquage/cache/invalidate')
    } catch {
      // silently fail — the user will see the button return to normal
    } finally {
      setCacheInvalidating(false)
    }
  }

  return (
    <div id="section-demarches" className="flex flex-col gap-6">
      {/* Comarquage block */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            Guichet démarches (service-public.gouv.fr)
          </h2>
          <p className="text-sm text-muted-foreground">
            Activez le module comarquage pour afficher les fiches démarches de service-public.gouv.fr sur votre site.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={formData.comarquage_enabled}
              onClick={() => {
                setFormData(prev => ({ ...prev, comarquage_enabled: !prev.comarquage_enabled }))
                setIsDirty(true)
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                formData.comarquage_enabled ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  formData.comarquage_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <Label>Activer le guichet démarches</Label>
          </div>

          {formData.comarquage_enabled && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Code INSEE de la commune</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={formData.code_insee}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 5)
                        onFieldChange('code_insee', value)
                      }}
                      placeholder="Ex: 69123"
                      maxLength={5}
                      className={errors.code_insee ? 'border-destructive' : ''}
                    />
                    {communeLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {communeName && !communeLoading && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {communeName}
                      </span>
                    )}
                    {communeError && !communeLoading && (
                      <span className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {communeError}
                      </span>
                    )}
                  </div>
                  {errors.code_insee && (
                    <p className="mt-1 text-sm text-destructive">{errors.code_insee}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    Code INSEE à 5 chiffres de votre commune (utilisé pour les données locales)
                  </p>
                </div>
              </div>

              <div>
                <Label className="mb-2">Audiences activées</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.comarquage_audiences_particuliers}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, comarquage_audiences_particuliers: e.target.checked }))
                        setIsDirty(true)
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    Particuliers
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.comarquage_audiences_professionnels}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, comarquage_audiences_professionnels: e.target.checked }))
                        setIsDirty(true)
                      }}
                      className="h-4 w-4 rounded border-input"
                    />
                    Professionnels
                  </label>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sélectionnez les audiences pour lesquelles afficher les fiches démarches
                </p>
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleInvalidateCache}
                  disabled={cacheInvalidating}
                >
                  {cacheInvalidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {cacheInvalidating ? 'Vidage en cours...' : 'Vider le cache des fiches'}
                </Button>
                <p className="mt-1 text-sm text-muted-foreground">
                  Force le re-téléchargement des données depuis service-public.gouv.fr
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
