import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useSite, useUpdateSite, type UpdateSiteData } from '../hooks/api/useSites'
import { useCanManageSite, useUserSite } from '../hooks/useUser'
import { toaster } from '../lib/toaster'

export const SiteConfigEdit = () => {
  const { site: userSite } = useUserSite()
  const { canEditConfig, hasSite } = useCanManageSite()
  const { data: site, isLoading, error } = useSite(userSite?.documentId || '')
  const { mutate: updateSite, isPending } = useUpdateSite()
  const navigate = useNavigate()

  const [formData, setFormData] = React.useState({
    name: '',
    theme: 'classique' as 'classique' | 'moderne' | 'accessible',
    contact_mail: '',
    contact_phone: '',
    address: '',
    colors: ''
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = React.useState(false)

  // Update form when site data loads
  React.useEffect(() => {
    if (site) {
      setFormData({
        name: site.name,
        theme: site.theme,
        contact_mail: site.contact_mail,
        contact_phone: site.contact_phone || '',
        address: site.address || '',
        colors: site.colors ? JSON.stringify(site.colors, null, 2) : ''
      })
    }
  }, [site])

  // Check permissions after hooks
  if (!hasSite) {
    return <ErrorState title="Site non trouvé" message="Aucun site associé à votre compte" />
  }

  if (!canEditConfig) {
    return (
      <ErrorState
        title="Accès refusé"
        message="Seuls les maires et adjoints peuvent modifier la configuration du site"
      />
    )
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du site est requis'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Maximum 100 caractères'
    }

    if (!formData.contact_mail.trim()) {
      newErrors.contact_mail = 'L\'email de contact est requis'
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.contact_mail)) {
      newErrors.contact_mail = 'Format d\'email invalide'
    }

    if (formData.colors.trim()) {
      try {
        JSON.parse(formData.colors)
      } catch {
        newErrors.colors = 'Format JSON invalide'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!site || !validateForm()) return

    let parsedColors = null
    if (formData.colors.trim()) {
      try {
        parsedColors = JSON.parse(formData.colors)
      } catch {
        return
      }
    }

    const updateData: UpdateSiteData = {
      documentId: site.documentId,
      name: formData.name,
      theme: formData.theme,
      contact_mail: formData.contact_mail,
      contact_phone: formData.contact_phone || undefined,
      address: formData.address || undefined,
      colors: parsedColors
    }

    updateSite(updateData, {
      onSuccess: () => {
        toaster.create({
          title: 'Configuration mise à jour',
          description: 'La configuration du site a été mise à jour avec succès.',
          type: 'success',
          duration: 3000,
        })
        navigate('/site')
      },
      onError: () => {
        toaster.create({
          title: 'Erreur lors de la sauvegarde',
          description: 'Une erreur est survenue lors de la sauvegarde de la configuration.',
          type: 'error',
          duration: 5000,
        })
      }
    })
  }

  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm('Vous avez des modifications non sauvegardées. Êtes-vous sûr de vouloir quitter ?')) {
        navigate('/site')
      }
    } else {
      navigate('/site')
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState title="Erreur de chargement" message="Impossible de charger la configuration du site" />
  if (!site) return <ErrorState title="Site non trouvé" message="Aucune configuration de site disponible" />

  return (
    <div className="mx-auto w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Modifier la configuration"
            subtitle="Paramètres du site"
            actions={[
              {
                label: "Annuler",
                onClick: handleCancel,
                variant: "ghost"
              },
              {
                label: isPending ? "Sauvegarde..." : "Sauvegarder",
                onClick: () => {
                  const form = document.querySelector('form') as HTMLFormElement
                  if (form) form.requestSubmit()
                },
                colorScheme: "blue",
                loading: isPending
              }
            ]}
          />

          {/* Informations générales */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                Informations générales
              </h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Nom du site</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Slug</Label>
                  <Input
                    value={site.slug}
                    disabled
                    className="bg-muted"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Le slug ne peut pas être modifié
                  </p>
                </div>

                <div>
                  <Label className="mb-2">Thème</Label>
                  <select
                    value={formData.theme}
                    onChange={(e) => handleInputChange('theme', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="classique">Classique</option>
                    <option value="moderne">Moderne</option>
                    <option value="accessible">Accessible</option>
                  </select>
                </div>

                <div>
                  <Label className="mb-2">Email de contact</Label>
                  <Input
                    type="email"
                    value={formData.contact_mail}
                    onChange={(e) => handleInputChange('contact_mail', e.target.value)}
                    className={errors.contact_mail ? 'border-destructive' : ''}
                  />
                  {errors.contact_mail && (
                    <p className="mt-1 text-sm text-destructive">{errors.contact_mail}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact et adresse */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                Informations de contact
              </h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Téléphone</Label>
                  <Input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    placeholder="Ex: 01 23 45 67 89"
                  />
                </div>

                <div>
                  <Label className="mb-2">Adresse</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Adresse complète de la mairie"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuration des couleurs */}
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                Configuration des couleurs
              </h2>

              <div>
                <Label className="mb-2">Couleurs du thème (JSON)</Label>
                <Textarea
                  value={formData.colors}
                  onChange={(e) => handleInputChange('colors', e.target.value)}
                  placeholder='{"primary": "#3182ce", "secondary": "#2d3748"}'
                  rows={6}
                  className={`font-mono text-sm ${errors.colors ? 'border-destructive' : ''}`}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Configuration JSON optionnelle pour personnaliser les couleurs du thème
                </p>
                {errors.colors && (
                  <p className="mt-1 text-sm text-destructive">{errors.colors}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="ghost" type="button" onClick={handleCancel} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
