import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Loader2 } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { RichTextEditor } from '../components/forms/RichTextEditor'
import { PageHeader } from '../components/layout'
import { useSite, useUpdateSite, type UpdateSiteData } from '../hooks/api/useSites'
import { useCanManageSite, useUserSite } from '../hooks/useUser'
import { toaster } from '../lib/toaster'

// Fields belonging to each tab, for error indicators
const TAB_FIELDS: Record<string, string[]> = {
  general: ['name', 'contact_mail', 'colors'],
  legal: ['siret', 'publication_director', 'hebergeur_name'],
  rgpd: [],
  accessibility: [],
  info: ['opening_hours'],
}

export const SiteConfigEdit = () => {
  const { site: userSite } = useUserSite()
  const { canEditConfig, hasSite } = useCanManageSite()
  const { data: site, isLoading, error } = useSite(userSite?.documentId || '')
  const { mutate: updateSite, isPending } = useUpdateSite()
  const navigate = useNavigate()

  const [formData, setFormData] = React.useState({
    // Informations générales
    name: '',
    theme: 'classique' as 'classique' | 'moderne' | 'accessible',
    contact_mail: '',
    contact_phone: '',
    address: '',
    colors: '',
    // Mentions légales
    siret: '',
    publication_director: '',
    publication_director_title: '',
    hebergeur_name: '',
    hebergeur_address: '',
    hebergeur_phone: '',
    credits: '',
    mentions_legales_extra: '',
    // RGPD
    dpo_name: '',
    dpo_email: '',
    dpo_phone: '',
    rgpd_policy: '',
    // Accessibilité
    accessibility_level: '' as '' | 'non-conforme' | 'partiellement-conforme' | 'conforme',
    accessibility_declaration: '',
    accessibility_schema_url: '',
    accessibility_action_plan_url: '',
    // Infos pratiques
    opening_hours: '',
    population: '',
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
        colors: site.colors ? JSON.stringify(site.colors, null, 2) : '',
        // Mentions légales (composant imbriqué)
        siret: site.mentions_legales?.siret || '',
        publication_director: site.mentions_legales?.publication_director || '',
        publication_director_title: site.mentions_legales?.publication_director_title || '',
        hebergeur_name: site.mentions_legales?.hebergeur_name || '',
        hebergeur_address: site.mentions_legales?.hebergeur_address || '',
        hebergeur_phone: site.mentions_legales?.hebergeur_phone || '',
        credits: site.mentions_legales?.credits || '',
        mentions_legales_extra: site.mentions_legales?.mentions_legales_extra || '',
        // RGPD (composant imbriqué)
        dpo_name: site.rgpd?.dpo_name || '',
        dpo_email: site.rgpd?.dpo_email || '',
        dpo_phone: site.rgpd?.dpo_phone || '',
        rgpd_policy: site.rgpd?.rgpd_policy || '',
        // Accessibilité (composant imbriqué)
        accessibility_level: site.accessibilite?.accessibility_level || '',
        accessibility_declaration: site.accessibilite?.accessibility_declaration || '',
        accessibility_schema_url: site.accessibilite?.accessibility_schema_url || '',
        accessibility_action_plan_url: site.accessibilite?.accessibility_action_plan_url || '',
        // Infos pratiques (composant imbriqué)
        opening_hours: site.infos_pratiques?.opening_hours ? JSON.stringify(site.infos_pratiques.opening_hours, null, 2) : '',
        population: site.infos_pratiques?.population?.toString() || '',
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

    // Mentions légales
    if (formData.siret && !/^\d{14}$/.test(formData.siret.replace(/\s/g, ''))) {
      newErrors.siret = 'Le SIRET doit contenir 14 chiffres'
    }

    // Infos pratiques
    if (formData.opening_hours.trim()) {
      try {
        JSON.parse(formData.opening_hours)
      } catch {
        newErrors.opening_hours = 'Format JSON invalide'
      }
    }

    if (formData.population && (isNaN(Number(formData.population)) || Number(formData.population) < 0)) {
      newErrors.population = 'La population doit être un nombre positif'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const tabHasErrors = (tabKey: string) => {
    const fields = TAB_FIELDS[tabKey] || []
    return fields.some(field => !!errors[field])
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

    let parsedOpeningHours = null
    if (formData.opening_hours.trim()) {
      try {
        parsedOpeningHours = JSON.parse(formData.opening_hours)
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
      colors: parsedColors,
      mentions_legales: {
        siret: formData.siret || undefined,
        publication_director: formData.publication_director || undefined,
        publication_director_title: formData.publication_director_title || undefined,
        hebergeur_name: formData.hebergeur_name || undefined,
        hebergeur_address: formData.hebergeur_address || undefined,
        hebergeur_phone: formData.hebergeur_phone || undefined,
        credits: formData.credits || undefined,
        mentions_legales_extra: formData.mentions_legales_extra || undefined,
      },
      rgpd: {
        dpo_name: formData.dpo_name || undefined,
        dpo_email: formData.dpo_email || undefined,
        dpo_phone: formData.dpo_phone || undefined,
        rgpd_policy: formData.rgpd_policy || undefined,
      },
      accessibilite: {
        accessibility_level: formData.accessibility_level || undefined,
        accessibility_declaration: formData.accessibility_declaration || undefined,
        accessibility_schema_url: formData.accessibility_schema_url || undefined,
        accessibility_action_plan_url: formData.accessibility_action_plan_url || undefined,
      },
      infos_pratiques: {
        opening_hours: parsedOpeningHours,
        population: formData.population ? Number(formData.population) : undefined,
      },
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

          <Tabs defaultValue="general">
            <TabsList className="w-full overflow-x-auto">
              <TabsTrigger value="general" className="gap-1.5">
                Informations générales
                {tabHasErrors('general') && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="legal" className="gap-1.5">
                Mentions légales
                {tabHasErrors('legal') && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="rgpd" className="gap-1.5">
                RGPD
                {tabHasErrors('rgpd') && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="accessibility" className="gap-1.5">
                Accessibilité
                {tabHasErrors('accessibility') && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-1.5">
                Infos pratiques
                {tabHasErrors('info') && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
              </TabsTrigger>
            </TabsList>

            {/* Onglet 1 — Informations générales */}
            <TabsContent value="general">
              <div className="flex flex-col gap-6">
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
                        <Label className="mb-2">Email de contact <span className="text-destructive">*</span></Label>
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
              </div>
            </TabsContent>

            {/* Onglet 2 — Mentions légales */}
            <TabsContent value="legal">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Mentions légales
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-2">SIRET</Label>
                      <Input
                        value={formData.siret}
                        onChange={(e) => handleInputChange('siret', e.target.value)}
                        placeholder="Ex: 123 456 789 00012"
                        className={errors.siret ? 'border-destructive' : ''}
                      />
                      {errors.siret && (
                        <p className="mt-1 text-sm text-destructive">{errors.siret}</p>
                      )}
                    </div>

                    <div>
                      <Label className="mb-2">Directeur de publication</Label>
                      <Input
                        value={formData.publication_director}
                        onChange={(e) => handleInputChange('publication_director', e.target.value)}
                        placeholder="Nom du directeur de publication"
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Titre du directeur de publication</Label>
                      <Input
                        value={formData.publication_director_title}
                        onChange={(e) => handleInputChange('publication_director_title', e.target.value)}
                        placeholder="Ex: Maire"
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Nom de l'hébergeur</Label>
                      <Input
                        value={formData.hebergeur_name}
                        onChange={(e) => handleInputChange('hebergeur_name', e.target.value)}
                        placeholder="Ex: Netlify, OVH..."
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Adresse de l'hébergeur</Label>
                      <Input
                        value={formData.hebergeur_address}
                        onChange={(e) => handleInputChange('hebergeur_address', e.target.value)}
                        placeholder="Adresse de l'hébergeur"
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Téléphone de l'hébergeur</Label>
                      <Input
                        type="tel"
                        value={formData.hebergeur_phone}
                        onChange={(e) => handleInputChange('hebergeur_phone', e.target.value)}
                        placeholder="Téléphone de l'hébergeur"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 pt-2">
                    <div>
                      <Label className="mb-2">Crédits</Label>
                      <RichTextEditor
                        value={formData.credits}
                        onChange={(value) => handleInputChange('credits', value)}
                        placeholder="Crédits photos, conception..."
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Mentions légales supplémentaires</Label>
                      <RichTextEditor
                        value={formData.mentions_legales_extra}
                        onChange={(value) => handleInputChange('mentions_legales_extra', value)}
                        placeholder="Informations complémentaires..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Onglet 3 — RGPD & Confidentialité */}
            <TabsContent value="rgpd">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    RGPD & Confidentialité
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-2">Nom du DPO</Label>
                      <Input
                        value={formData.dpo_name}
                        onChange={(e) => handleInputChange('dpo_name', e.target.value)}
                        placeholder="Délégué à la protection des données"
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Email du DPO</Label>
                      <Input
                        type="email"
                        value={formData.dpo_email}
                        onChange={(e) => handleInputChange('dpo_email', e.target.value)}
                        placeholder="dpo@mairie.fr"
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Téléphone du DPO</Label>
                      <Input
                        type="tel"
                        value={formData.dpo_phone}
                        onChange={(e) => handleInputChange('dpo_phone', e.target.value)}
                        placeholder="Téléphone du DPO"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label className="mb-2">Politique de confidentialité</Label>
                    <RichTextEditor
                      value={formData.rgpd_policy}
                      onChange={(value) => handleInputChange('rgpd_policy', value)}
                      placeholder="Décrivez votre politique de confidentialité..."
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Onglet 4 — Accessibilité */}
            <TabsContent value="accessibility">
              <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Accessibilité
                  </h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <Label className="mb-2">Niveau de conformité</Label>
                      <select
                        value={formData.accessibility_level}
                        onChange={(e) => handleInputChange('accessibility_level', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">— Sélectionner —</option>
                        <option value="non-conforme">Non conforme</option>
                        <option value="partiellement-conforme">Partiellement conforme</option>
                        <option value="conforme">Conforme</option>
                      </select>
                    </div>

                    <div>
                      <Label className="mb-2">URL du schéma pluriannuel</Label>
                      <Input
                        type="url"
                        value={formData.accessibility_schema_url}
                        onChange={(e) => handleInputChange('accessibility_schema_url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <Label className="mb-2">URL du plan d'action</Label>
                      <Input
                        type="url"
                        value={formData.accessibility_action_plan_url}
                        onChange={(e) => handleInputChange('accessibility_action_plan_url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label className="mb-2">Déclaration d'accessibilité</Label>
                    <RichTextEditor
                      value={formData.accessibility_declaration}
                      onChange={(value) => handleInputChange('accessibility_declaration', value)}
                      placeholder="Déclaration d'accessibilité du site..."
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Onglet 5 — Infos pratiques */}
            <TabsContent value="info">
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
                        onChange={(e) => handleInputChange('population', e.target.value)}
                        placeholder="Nombre d'habitants"
                        className={errors.population ? 'border-destructive' : ''}
                      />
                      {errors.population && (
                        <p className="mt-1 text-sm text-destructive">{errors.population}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2">Horaires d'ouverture (JSON)</Label>
                    <Textarea
                      value={formData.opening_hours}
                      onChange={(e) => handleInputChange('opening_hours', e.target.value)}
                      placeholder='{"lundi": "8h30 - 12h / 14h - 17h", "mardi": "8h30 - 12h"}'
                      rows={8}
                      className={`font-mono text-sm ${errors.opening_hours ? 'border-destructive' : ''}`}
                    />
                    <p className="mt-1 text-sm text-muted-foreground">
                      Format JSON décrivant les horaires d'ouverture de la mairie
                    </p>
                    {errors.opening_hours && (
                      <p className="mt-1 text-sm text-destructive">{errors.opening_hours}</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

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
