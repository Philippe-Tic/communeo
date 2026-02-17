import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useCreateEvent, useEvent, useUpdateEvent, type Event } from '../hooks/api/useEvents'
import { toaster } from '../lib/toaster'

interface EventFormData {
  title: string
  description: string
  start_date: string
  end_date: string
  location: string
  address: string
  price: string
  external_link: string
  category: 'cultural' | 'sport' | 'meeting' | 'celebration' | 'workshop' | 'conference'
  organizer: string
  contact_email: string
  contact_phone: string
  max_participants: string
  registration_required: boolean
  registration_deadline: string
  featured: boolean
}

interface EventFormProps {
  isEditing?: boolean
  initialData?: Event
}

export function EventForm({ isEditing = false, initialData }: EventFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<EventFormData>({
    defaultValues: {
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      location: '',
      address: '',
      price: '',
      external_link: '',
      category: 'cultural',
      organizer: '',
      contact_email: '',
      contact_phone: '',
      max_participants: '',
      registration_required: false,
      registration_deadline: '',
      featured: false,
    },
  })

  // Réinitialiser le formulaire avec les données initiales
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        description: initialData.description,
        start_date: initialData.start_date.split('T')[0] + 'T' + initialData.start_date.split('T')[1].substring(0, 5),
        end_date: initialData.end_date ? initialData.end_date.split('T')[0] + 'T' + initialData.end_date.split('T')[1].substring(0, 5) : '',
        location: initialData.location || '',
        address: initialData.address || '',
        price: initialData.price || '',
        external_link: initialData.external_link || '',
        category: initialData.category,
        organizer: initialData.organizer || '',
        contact_email: initialData.contact_email || '',
        contact_phone: initialData.contact_phone || '',
        max_participants: initialData.max_participants?.toString() || '',
        registration_required: initialData.registration_required,
        registration_deadline: initialData.registration_deadline ? initialData.registration_deadline.split('T')[0] + 'T' + initialData.registration_deadline.split('T')[1].substring(0, 5) : '',
        featured: initialData.featured,
      })
    }
  }, [initialData, reset])

  const onSubmit = async (data: EventFormData) => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const submitData = {
        ...data,
        max_participants: data.max_participants ? parseInt(data.max_participants) : undefined,
      }

      if (isEditing && id) {
        await updateEventMutation.mutateAsync({ id, ...submitData })
        toaster.create({
          title: 'Événement mis à jour',
          description: 'L\'événement a été mis à jour avec succès.',
          type: 'success',
          duration: 3000,
        })
      } else {
        await createEventMutation.mutateAsync(submitData)
        toaster.create({
          title: 'Événement créé',
          description: 'L\'événement a été créé avec succès.',
          type: 'success',
          duration: 3000,
        })
      }

      navigate('/events')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde.',
        type: 'error',
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEditing ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
          actions={[{ label: 'Retour', onClick: () => navigate('/events'), variant: 'outline' }]}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            {/* Informations de base */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Informations de base</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Titre *</Label>
                  <Input
                    placeholder="Titre de l'événement"
                    {...register('title', { required: 'Le titre est requis' })}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Description *</Label>
                  <Textarea
                    placeholder="Description de l'événement"
                    rows={8}
                    {...register('description', { required: 'La description est requise' })}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Catégorie</Label>
                  <select
                    {...register('category')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="cultural">Culturel</option>
                    <option value="sport">Sport</option>
                    <option value="meeting">Réunion</option>
                    <option value="celebration">Célébration</option>
                    <option value="workshop">Atelier</option>
                    <option value="conference">Conférence</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dates et lieu */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Dates et lieu</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Date et heure de début *</Label>
                  <Input
                    type="datetime-local"
                    {...register('start_date', { required: 'La date de début est requise' })}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-destructive">{errors.start_date.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Date et heure de fin</Label>
                  <Input
                    type="datetime-local"
                    {...register('end_date')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Lieu</Label>
                  <Input
                    placeholder="Nom du lieu"
                    {...register('location')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Adresse complète</Label>
                  <Textarea
                    placeholder="Adresse complète du lieu"
                    rows={3}
                    {...register('address')}
                  />
                </div>
              </div>
            </div>

            {/* Informations pratiques */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Informations pratiques</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Prix</Label>
                  <Input
                    placeholder="Gratuit / 10€ / Sur inscription..."
                    {...register('price')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Lien externe</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    {...register('external_link')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Organisateur</Label>
                  <Input
                    placeholder="Nom de l'organisateur"
                    {...register('organizer')}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-2">Email de contact *</Label>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      {...register('contact_email', { required: 'L\'email de contact est requis' })}
                    />
                  </div>

                  <div>
                    <Label className="mb-2">Téléphone</Label>
                    <Input
                      placeholder="01 23 45 67 89"
                      {...register('contact_phone')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Inscription */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Inscription</h2>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Label>Inscription requise</Label>
                  <input
                    type="checkbox"
                    {...register('registration_required')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>

                <div>
                  <Label className="mb-2">Nombre maximum de participants</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    {...register('max_participants')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Date limite d'inscription</Label>
                  <Input
                    type="datetime-local"
                    {...register('registration_deadline')}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Label>Événement à la une</Label>
                  <input
                    type="checkbox"
                    {...register('featured')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/events')}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CreateEvent() {
  return <EventForm />
}

export function EditEvent() {
  const { id } = useParams<{ id: string }>()
  const { data: event, isLoading, error } = useEvent(id || '')

  if (isLoading) {
    return <LoadingSpinner message="Chargement de l'événement..." />
  }

  if (error || !event) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Événement non trouvé</p>
      </div>
    )
  }

  return <EventForm isEditing={true} initialData={event} />
}
