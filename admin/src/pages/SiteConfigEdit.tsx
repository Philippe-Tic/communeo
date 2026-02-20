import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Loader2, Wand2 } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { RichTextEditor } from '../components/forms/RichTextEditor'
import { PageHeader } from '../components/layout'
import { useSite, useUpdateSite, type UpdateSiteData } from '../hooks/api/useSites'
import { useCanManageSite, useUserSite } from '../hooks/useUser'
import { toaster } from '../lib/toaster'

// RGPD template
const RGPD_TEMPLATE = `<h2>Politique de confidentialité</h2>
<p>La commune de <strong>[NOM DE LA COMMUNE]</strong> s'engage à protéger la vie privée des utilisateurs de son site internet, conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée.</p>

<h3>Responsable du traitement</h3>
<p>Le responsable du traitement des données est la commune de <strong>[NOM DE LA COMMUNE]</strong>, représentée par son Maire.</p>

<h3>Données collectées</h3>
<p>Dans le cadre de l'utilisation de ce site, les données suivantes peuvent être collectées :</p>
<ul>
<li>Données d'identification : nom, prénom, adresse email, numéro de téléphone</li>
<li>Données de connexion : adresse IP, date et heure de connexion, pages consultées</li>
<li>Données transmises via les formulaires de contact</li>
</ul>

<h3>Finalités du traitement</h3>
<p>Les données personnelles sont collectées pour :</p>
<ul>
<li>Répondre aux demandes des usagers via le formulaire de contact</li>
<li>Assurer le bon fonctionnement et la sécurité du site</li>
<li>Établir des statistiques de fréquentation anonymisées</li>
</ul>

<h3>Base légale</h3>
<p>Le traitement des données repose sur :</p>
<ul>
<li>L'exécution d'une mission d'intérêt public (article 6.1.e du RGPD)</li>
<li>Le consentement de l'utilisateur pour les cookies non essentiels (article 6.1.a du RGPD)</li>
</ul>

<h3>Durée de conservation</h3>
<p>Les données personnelles sont conservées pendant une durée n'excédant pas celle nécessaire aux finalités pour lesquelles elles sont collectées, conformément à la réglementation en vigueur.</p>

<h3>Droits des personnes</h3>
<p>Conformément au RGPD, vous disposez des droits suivants :</p>
<ul>
<li>Droit d'accès à vos données personnelles</li>
<li>Droit de rectification</li>
<li>Droit à l'effacement</li>
<li>Droit à la limitation du traitement</li>
<li>Droit à la portabilité</li>
<li>Droit d'opposition</li>
</ul>
<p>Pour exercer ces droits, contactez le Délégué à la Protection des Données (DPO) aux coordonnées indiquées dans les mentions légales.</p>

<h3>Cookies</h3>
<p>Ce site utilise des cookies essentiels au fonctionnement du site. Les cookies non essentiels ne sont déposés qu'après recueil de votre consentement via le bandeau cookies.</p>

<h3>Réclamation</h3>
<p>Si vous estimez que le traitement de vos données constitue une violation du RGPD, vous pouvez introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</p>`

// Fields belonging to each tab, for error indicators
const TAB_FIELDS: Record<string, string[]> = {
  general: ['name', 'contact_mail', 'colors'],
  legal: ['siret', 'publication_director', 'hebergeur_name'],
  rgpd: ['dpo_name', 'dpo_email', 'rgpd_policy'],
  accessibility: ['accessibility_level'],
  info: ['opening_hours'],
  opendata: [],
  demarches: ['appointment_url'],
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
    contact_form_intro: '',
    // Open Data
    open_data_enabled: false,
    open_data_url: '',
    open_data_platform: 'none' as 'data-gouv-fr' | 'opendatasoft' | 'custom' | 'none',
    // Démarches identité
    has_dispositif_recueil: false,
    appointment_url: '',
    appointment_provider: 'ants-rdv' as 'synbird' | 'ants-rdv' | 'rdv-service-public' | 'autre',
    remise_titre_info: '',
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
        contact_form_intro: site.infos_pratiques?.contact_form_intro || '',
        // Open Data
        open_data_enabled: site.open_data_enabled || false,
        open_data_url: site.open_data_url || '',
        open_data_platform: site.open_data_platform || 'none',
        // Démarches identité
        has_dispositif_recueil: site.demarches_identite?.has_dispositif_recueil || false,
        appointment_url: site.demarches_identite?.appointment_url || '',
        appointment_provider: site.demarches_identite?.appointment_provider || 'ants-rdv',
        remise_titre_info: site.demarches_identite?.remise_titre_info || '',
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

    // Mentions légales — required fields
    if (!formData.siret.trim()) {
      newErrors.siret = 'Le SIRET est requis'
    } else if (!/^\d{14}$/.test(formData.siret.replace(/\s/g, ''))) {
      newErrors.siret = 'Le SIRET doit contenir 14 chiffres'
    }

    if (!formData.publication_director.trim()) {
      newErrors.publication_director = 'Le directeur de publication est requis'
    }

    if (!formData.hebergeur_name.trim()) {
      newErrors.hebergeur_name = 'Le nom de l\'hébergeur est requis'
    }

    // RGPD — required fields
    if (!formData.dpo_name.trim()) {
      newErrors.dpo_name = 'Le nom du DPO est requis'
    }

    if (!formData.dpo_email.trim()) {
      newErrors.dpo_email = 'L\'email du DPO est requis'
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.dpo_email)) {
      newErrors.dpo_email = 'Format d\'email invalide'
    }

    if (!formData.rgpd_policy || formData.rgpd_policy.replace(/<[^>]*>/g, '').trim().length < 50) {
      newErrors.rgpd_policy = 'La politique de confidentialité est requise (min. 50 caractères)'
    }

    // Accessibilité — required field
    if (!formData.accessibility_level) {
      newErrors.accessibility_level = 'Le niveau d\'accessibilité est requis'
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
        contact_form_intro: formData.contact_form_intro || undefined,
      },
      open_data_enabled: formData.open_data_enabled,
      open_data_url: formData.open_data_url || undefined,
      open_data_platform: formData.open_data_platform,
      demarches_identite: {
        has_dispositif_recueil: formData.has_dispositif_recueil,
        appointment_url: formData.appointment_url || undefined,
        appointment_provider: formData.appointment_provider,
        remise_titre_info: formData.remise_titre_info || undefined,
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
            breadcrumbs={[
              { label: 'Site', href: '/site' },
              { label: 'Modifier' },
            ]}
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
              <TabsTrigger value="opendata" className="gap-1.5">
                Open Data
                {tabHasErrors('opendata') && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
              </TabsTrigger>
              <TabsTrigger value="demarches" className="gap-1.5">
                Démarches
                {tabHasErrors('demarches') && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
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
                      <Label className="mb-2">SIRET <span className="text-destructive">*</span></Label>
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
                      <Label className="mb-2">Directeur de publication <span className="text-destructive">*</span></Label>
                      <Input
                        value={formData.publication_director}
                        onChange={(e) => handleInputChange('publication_director', e.target.value)}
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
                        onChange={(e) => handleInputChange('publication_director_title', e.target.value)}
                        placeholder="Ex: Maire"
                      />
                    </div>

                    <div>
                      <Label className="mb-2">Nom de l'hébergeur <span className="text-destructive">*</span></Label>
                      <Input
                        value={formData.hebergeur_name}
                        onChange={(e) => handleInputChange('hebergeur_name', e.target.value)}
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
                      <Label className="mb-2">Nom du DPO <span className="text-destructive">*</span></Label>
                      <Input
                        value={formData.dpo_name}
                        onChange={(e) => handleInputChange('dpo_name', e.target.value)}
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
                        onChange={(e) => handleInputChange('dpo_email', e.target.value)}
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
                        onChange={(e) => handleInputChange('dpo_phone', e.target.value)}
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
                            handleInputChange('rgpd_policy', RGPD_TEMPLATE)
                          }}
                        >
                          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                          Charger le modèle
                        </Button>
                      )}
                    </div>
                    <RichTextEditor
                      value={formData.rgpd_policy}
                      onChange={(value) => handleInputChange('rgpd_policy', value)}
                      placeholder="Décrivez votre politique de confidentialité..."
                    />
                    {errors.rgpd_policy && (
                      <p className="mt-1 text-sm text-destructive">{errors.rgpd_policy}</p>
                    )}
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
                      <Label className="mb-2">Niveau de conformité <span className="text-destructive">*</span></Label>
                      <select
                        value={formData.accessibility_level}
                        onChange={(e) => handleInputChange('accessibility_level', e.target.value)}
                        className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.accessibility_level ? 'border-destructive' : 'border-input'}`}
                      >
                        <option value="">— Sélectionner —</option>
                        <option value="non-conforme">Non conforme</option>
                        <option value="partiellement-conforme">Partiellement conforme</option>
                        <option value="conforme">Conforme</option>
                      </select>
                      {errors.accessibility_level && (
                        <p className="mt-1 text-sm text-destructive">{errors.accessibility_level}</p>
                      )}
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
                    <Label className="mb-2">Texte d'introduction de la page Contact</Label>
                    <Textarea
                      value={formData.contact_form_intro}
                      onChange={(e) => handleInputChange('contact_form_intro', e.target.value)}
                      placeholder="Vous pouvez nous contacter en utilisant le formulaire ci-dessous..."
                      rows={4}
                    />
                    <p className="mt-1 text-sm text-muted-foreground">
                      Affiché au-dessus du formulaire sur la page /contact
                    </p>
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

            {/* Onglet 6 — Open Data */}
            <TabsContent value="opendata">
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
                      <div>
                        <Label className="mb-2">Plateforme Open Data</Label>
                        <select
                          value={formData.open_data_platform}
                          onChange={(e) => handleInputChange('open_data_platform', e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="none">Aucune</option>
                          <option value="data-gouv-fr">data.gouv.fr</option>
                          <option value="opendatasoft">OpenDataSoft</option>
                          <option value="custom">Autre plateforme</option>
                        </select>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Plateforme sur laquelle vos données sont publiées
                        </p>
                      </div>

                      <div>
                        <Label className="mb-2">URL du portail Open Data</Label>
                        <Input
                          type="url"
                          value={formData.open_data_url}
                          onChange={(e) => handleInputChange('open_data_url', e.target.value)}
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
            </TabsContent>

            {/* Onglet 7 — Démarches identité */}
            <TabsContent value="demarches">
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
                        <div>
                          <Label className="mb-2">Plateforme de rendez-vous</Label>
                          <select
                            value={formData.appointment_provider}
                            onChange={(e) => handleInputChange('appointment_provider', e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="ants-rdv">ANTS RDV</option>
                            <option value="synbird">Synbird</option>
                            <option value="rdv-service-public">rdv-service-public.fr</option>
                            <option value="autre">Autre</option>
                          </select>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Service utilisé pour la prise de rendez-vous en ligne
                          </p>
                        </div>

                        <div>
                          <Label className="mb-2">URL de prise de rendez-vous</Label>
                          <Input
                            type="url"
                            value={formData.appointment_url}
                            onChange={(e) => handleInputChange('appointment_url', e.target.value)}
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
                          onChange={(e) => handleInputChange('remise_titre_info', e.target.value)}
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
