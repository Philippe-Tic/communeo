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
  useWasteSchedule,
  useCreateWasteSchedule,
  useUpdateWasteSchedule,
  type WasteSchedule,
} from '../hooks/api/useWasteSchedules'
import { WASTE_TYPE_OPTIONS, COLLECTION_DAY_OPTIONS, FREQUENCY_OPTIONS } from '../lib/constants/waste-types'
import type { WasteType, CollectionDay, Frequency } from '../lib/constants/waste-types'
import { toaster } from '../lib/toaster'

interface WasteScheduleFormData {
  waste_type: WasteType
  collection_day: CollectionDay
  frequency: Frequency
  start_date: string
  zone: string
  notes: string
  active: boolean
}

interface WasteScheduleFormProps {
  isEditing?: boolean
  initialData?: WasteSchedule
}

export function WasteScheduleForm({ isEditing = false, initialData }: WasteScheduleFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMutation = useCreateWasteSchedule()
  const updateMutation = useUpdateWasteSchedule()

  const { register, handleSubmit, control, watch } = useForm<WasteScheduleFormData>({
    defaultValues: {
      waste_type: initialData?.waste_type || 'ordures-menageres',
      collection_day: initialData?.collection_day || 'lundi',
      frequency: initialData?.frequency || 'hebdomadaire',
      start_date: initialData?.start_date || '',
      zone: initialData?.zone || '',
      notes: initialData?.notes || '',
      active: initialData?.active ?? true,
    },
  })

  const frequency = watch('frequency')

  const onSubmit = async (data: WasteScheduleFormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      const submitData = {
        waste_type: data.waste_type,
        collection_day: data.collection_day,
        frequency: data.frequency,
        start_date: data.start_date || undefined,
        zone: data.zone || undefined,
        notes: data.notes || undefined,
        active: data.active,
      }
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, ...submitData })
        toaster.create({ title: 'Planning modifie', description: 'Le planning a ete mis a jour avec succes.', type: 'success', duration: 3000 })
      } else {
        await createMutation.mutateAsync(submitData)
        toaster.create({ title: 'Planning cree', description: 'Le planning a ete cree avec succes.', type: 'success', duration: 3000 })
      }
      navigate('/collecte-dechets')
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
          title={isEditing ? 'Modifier le planning' : 'Nouveau planning'}
          subtitle="Configurez le jour et la frequence de collecte pour un type de dechet"
          actions={[
            { label: 'Retour', onClick: () => navigate('/collecte-dechets'), variant: 'outline' as const },
          ]}
          breadcrumbs={[
            { label: 'Collecte dechets', href: '/collecte-dechets' },
            { label: isEditing ? 'Modifier' : 'Nouveau' },
          ]}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <FormSection title="Type de collecte">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Controller
                  name="waste_type"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Type de dechet"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={WASTE_TYPE_OPTIONS}
                    />
                  )}
                />
                <Controller
                  name="collection_day"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Jour de collecte"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={COLLECTION_DAY_OPTIONS}
                    />
                  )}
                />
                <Controller
                  name="frequency"
                  control={control}
                  render={({ field }) => (
                    <FormSelect
                      label="Frequence"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={FREQUENCY_OPTIONS}
                    />
                  )}
                />
              </div>
            </FormSection>

            <FormSection title="Planification">
              <div>
                <Label className="mb-2">Date de reference</Label>
                <Input type="date" {...register('start_date')} />
                <p className="mt-1 text-xs text-muted-foreground">
                  {frequency === 'hebdomadaire'
                    ? 'Optionnel pour les collectes hebdomadaires.'
                    : frequency === 'bimensuel'
                    ? 'Permet de determiner les semaines paires/impaires de collecte.'
                    : 'Permet de determiner quelle semaine du mois la collecte a lieu.'}
                </p>
              </div>
            </FormSection>

            <FormSection title="Zone et notes">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Zone</Label>
                  <Input
                    placeholder="Ex: Centre-ville, Quartier Nord..."
                    maxLength={100}
                    {...register('zone')}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Optionnel. Permet de distinguer les zones si les jours different.
                  </p>
                </div>
                <div>
                  <Label className="mb-2">Notes</Label>
                  <Textarea
                    placeholder="Informations complementaires..."
                    maxLength={500}
                    rows={3}
                    {...register('notes')}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Statut">
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormCheckbox
                    label="Planning actif"
                    description="Visible sur le site public"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FormSection>

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/collecte-dechets')}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Modifier' : 'Creer'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CreateWasteSchedule() {
  return <WasteScheduleForm />
}

export function EditWasteSchedule() {
  const { id } = useParams<{ id: string }>()
  const { data: schedule, isLoading, error } = useWasteSchedule(id || '')

  if (isLoading) return <LoadingSpinner message="Chargement du planning..." />
  if (error || !schedule) {
    return <NotFoundBanner message="Planning non trouve" />
  }
  return <WasteScheduleForm isEditing={true} initialData={schedule} />
}
