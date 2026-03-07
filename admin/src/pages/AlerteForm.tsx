import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner, NotFoundBanner } from '../components/common'
import { FormCheckbox } from '../components/forms/FormCheckbox'
import { FormSection } from '../components/forms/FormSection'
import { FormSelect } from '../components/forms/FormSelect'
import { PageHeader } from '../components/layout'
import {
  useAlerte,
  useCreateAlerte,
  useUpdateAlerte,
  type Alerte,
  type AlerteSeverity,
  type AlerteType,
} from '../hooks/api/useAlertes'
import { ALERTE_TYPE_OPTIONS } from '../lib/constants/alerte-types'
import { toaster } from '../lib/toaster'

interface AlerteFormData {
  title: string
  message: string
  severity: AlerteSeverity
  active: boolean
  display_from: string
  display_until: string
  link_url: string
  link_label: string
  alert_type: string
  location: string
  start_date: string
  end_date: string
  affected_area: string
}

interface AlerteFormProps {
  isEditing?: boolean
  initialData?: Alerte
}

export function AlerteForm({ isEditing = false, initialData }: AlerteFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMutation = useCreateAlerte()
  const updateMutation = useUpdateAlerte()

  const { register, handleSubmit, formState: { errors }, control } = useForm<AlerteFormData>({
    defaultValues: {
      title: initialData?.title || '',
      message: initialData?.message || '',
      severity: initialData?.severity || 'info',
      active: initialData?.active ?? false,
      display_from: initialData?.display_from ? initialData.display_from.slice(0, 16) : '',
      display_until: initialData?.display_until ? initialData.display_until.slice(0, 16) : '',
      link_url: initialData?.link_url || '',
      link_label: initialData?.link_label || '',
      alert_type: initialData?.alert_type || '',
      location: initialData?.location || '',
      start_date: initialData?.start_date || '',
      end_date: initialData?.end_date || '',
      affected_area: initialData?.affected_area || '',
    },
  })

  const onSubmit = async (data: AlerteFormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const submitData = {
        title: data.title,
        message: data.message,
        severity: data.severity,
        active: data.active,
        display_from: data.display_from || undefined,
        display_until: data.display_until || undefined,
        link_url: data.link_url || undefined,
        link_label: data.link_label || undefined,
        alert_type: (data.alert_type || undefined) as AlerteType | undefined,
        location: data.location || undefined,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
        affected_area: data.affected_area || undefined,
      }
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, ...submitData })
        toaster.create({ title: 'Alerte modifiée', description: 'L\'alerte a été mise à jour avec succès.', type: 'success', duration: 3000 })
      } else {
        await createMutation.mutateAsync(submitData)
        toaster.create({ title: 'Alerte créée', description: 'L\'alerte a été créée avec succès.', type: 'success', duration: 3000 })
      }
      navigate('/alertes')
    } catch {
      toaster.create({ title: 'Erreur', description: 'Une erreur est survenue lors de la sauvegarde.', type: 'error', duration: 5000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEditing ? 'Modifier l\'alerte' : 'Nouvelle alerte'}
          subtitle="Les alertes s'affichent comme un bandeau en haut du site public"
          actions={[
            { label: 'Retour', onClick: () => navigate('/alertes'), variant: 'outline' as const },
          ]}
          breadcrumbs={[
            { label: 'Alertes', href: '/alertes' },
            { label: isEditing ? 'Modifier' : 'Nouvelle' },
          ]}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <FormSection title="Contenu">
              <div>
                <Label className="mb-2">Titre *</Label>
                <Input
                  placeholder="Ex: Alerte météo - Vigilance orange"
                  maxLength={200}
                  {...register('title', { required: 'Le titre est requis' })}
                />
                {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
              </div>

              <div>
                <Label className="mb-2">Message *</Label>
                <Textarea
                  placeholder="Décrivez l'alerte en quelques phrases..."
                  maxLength={500}
                  rows={3}
                  {...register('message', { required: 'Le message est requis' })}
                />
                {errors.message && <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                  name="severity"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Niveau de gravité"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        { value: 'info', label: 'Information' },
                        { value: 'warning', label: 'Avertissement' },
                        { value: 'critical', label: 'Critique' },
                      ]}
                    />
                  )}
                />

                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <FormCheckbox
                      label="Alerte active"
                      description="Visible sur le site public"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </FormSection>

            <FormSection title="Type et localisation">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                  name="alert_type"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Type d'alerte"
                      value={field.value || '__none__'}
                      onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                      options={[
                        { value: '__none__', label: 'Non categorise' },
                        ...ALERTE_TYPE_OPTIONS,
                      ]}
                    />
                  )}
                />

                <div>
                  <Label className="mb-2">Localisation</Label>
                  <Input
                    placeholder="Ex: Rue de la Mairie, centre-ville"
                    maxLength={200}
                    {...register('location')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Date de debut</Label>
                  <Input type="date" {...register('start_date')} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Date de debut de la perturbation
                  </p>
                </div>

                <div>
                  <Label className="mb-2">Date de fin</Label>
                  <Input type="date" {...register('end_date')} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Date de fin prevue
                  </p>
                </div>
              </div>

              <div>
                <Label className="mb-2">Zone affectee</Label>
                <Textarea
                  placeholder="Decrivez la zone affectee..."
                  maxLength={500}
                  rows={2}
                  {...register('affected_area')}
                />
              </div>
            </FormSection>

            <FormSection title="Planification">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Afficher à partir de</Label>
                  <Input type="datetime-local" {...register('display_from')} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Laisser vide pour afficher immédiatement
                  </p>
                </div>

                <div>
                  <Label className="mb-2">Afficher jusqu'à</Label>
                  <Input type="datetime-local" {...register('display_until')} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Laisser vide pour afficher indéfiniment
                  </p>
                </div>
              </div>
            </FormSection>

            <FormSection title="Lien optionnel">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">URL du lien</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    {...register('link_url')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Texte du lien</Label>
                  <Input
                    placeholder="En savoir plus"
                    maxLength={100}
                    {...register('link_label')}
                  />
                </div>
              </div>
            </FormSection>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/alertes')}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CreateAlerte() {
  return <AlerteForm />
}

export function EditAlerte() {
  const { id } = useParams<{ id: string }>()
  const { data: alerte, isLoading, error } = useAlerte(id || '')

  if (isLoading) return <LoadingSpinner message="Chargement de l'alerte..." />
  if (error || !alerte) {
    return <NotFoundBanner message="Alerte non trouvée" />
  }
  return <AlerteForm isEditing={true} initialData={alerte} />
}
