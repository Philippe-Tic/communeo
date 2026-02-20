import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/common'
import { FormCheckbox } from '../components/forms/FormCheckbox'
import { FormSection } from '../components/forms/FormSection'
import { FormSelect } from '../components/forms/FormSelect'
import { RichTextEditor } from '../components/forms/RichTextEditor'
import { PageHeader } from '../components/layout'
import { ContentPreview } from '../components/preview/ContentPreview'
import { useCreateEvent, useEvent, useUpdateEvent, type Event } from '../hooks/api/useEvents'
import { toaster } from '../lib/toaster'

interface EventFormData {
  title: string
  slug: string
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
  const [showPreview, setShowPreview] = useState(false)
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')

  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent()

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue, control } = useForm<EventFormData>({
    defaultValues: {
      title: '',
      slug: '',
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

  const watchedTitle = watch('title')
  const watchedDescription = watch('description')

  useEffect(() => {
    if (watchedTitle && !isEditing) {
      const slug = watchedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setValue('slug', slug)
    }
  }, [watchedTitle, setValue, isEditing])

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        slug: initialData.slug,
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
        title: data.title,
        slug: data.slug,
        description: data.description,
        start_date: data.start_date,
        category: data.category,
        featured: data.featured,
        registration_required: data.registration_required,
        end_date: data.end_date || undefined,
        location: data.location || undefined,
        address: data.address || undefined,
        price: data.price || undefined,
        external_link: data.external_link || undefined,
        organizer: data.organizer || undefined,
        contact_email: data.contact_email || undefined,
        contact_phone: data.contact_phone || undefined,
        max_participants: data.max_participants ? parseInt(data.max_participants) : undefined,
        registration_deadline: data.registration_deadline || undefined,
      }
      if (isEditing && id) {
        await updateEventMutation.mutateAsync({ id, ...submitData })
        toaster.create({ title: 'Événement mis à jour', description: 'L\'événement a été mis à jour avec succès.', type: 'success', duration: 3000 })
      } else {
        await createEventMutation.mutateAsync(submitData)
        toaster.create({ title: 'Événement créé', description: 'L\'événement a été créé avec succès.', type: 'success', duration: 3000 })
      }
      navigate('/events')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toaster.create({ title: 'Erreur', description: 'Une erreur est survenue lors de la sauvegarde.', type: 'error', duration: 5000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={showPreview ? 'mx-auto max-w-7xl' : 'mx-auto max-w-4xl'}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEditing ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
          actions={[
            {
              label: showPreview ? 'Masquer l\'aperçu' : 'Aperçu',
              onClick: () => setShowPreview(!showPreview),
              variant: showPreview ? 'solid' : 'outline',
            },
            { label: 'Retour', onClick: () => navigate('/events'), variant: 'outline' },
          ]}
          breadcrumbs={[
            { label: 'Événements', href: '/events' },
            { label: isEditing ? 'Modifier' : 'Nouveau' },
          ]}
        />

        {showPreview && (
          <div className="flex gap-1 rounded-lg bg-muted p-1 lg:hidden">
            <button type="button" onClick={() => setMobileTab('edit')} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mobileTab === 'edit' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              Éditer
            </button>
            <button type="button" onClick={() => setMobileTab('preview')} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mobileTab === 'preview' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              Aperçu
            </button>
          </div>
        )}

        <div className={showPreview ? 'flex gap-6' : ''}>
          <div className={showPreview ? `flex-[3] ${mobileTab === 'preview' ? 'hidden lg:block' : ''}` : ''}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-6">
                <FormSection title="Informations générales">
                  <div>
                    <Label className="mb-2">Titre *</Label>
                    <Input placeholder="Titre de l'événement" {...register('title', { required: 'Le titre est requis' })} />
                    {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
                  </div>

                  <div>
                    <Label className="mb-2">Slug *</Label>
                    <Input placeholder="slug-de-l-evenement" {...register('slug', { required: 'Le slug est requis' })} />
                    {errors.slug && <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>}
                  </div>

                  <div>
                    <Label className="mb-2">Description *</Label>
                    <Controller
                      name="description"
                      control={control}
                      rules={{ required: 'La description est requise' }}
                      render={({ field }) => (
                        <RichTextEditor variant="full" value={field.value} onChange={field.onChange} placeholder="Description de l'événement" error={!!errors.description} />
                      )}
                    />
                    {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>}
                  </div>

                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        label="Catégorie"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: 'cultural', label: 'Culturel' },
                          { value: 'sport', label: 'Sport' },
                          { value: 'meeting', label: 'Réunion' },
                          { value: 'celebration', label: 'Célébration' },
                          { value: 'workshop', label: 'Atelier' },
                          { value: 'conference', label: 'Conférence' },
                        ]}
                      />
                    )}
                  />
                </FormSection>

                <FormSection title="Dates et lieu">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-2">Date et heure de début *</Label>
                      <Input type="datetime-local" {...register('start_date', { required: 'La date de début est requise' })} />
                      {errors.start_date && <p className="mt-1 text-sm text-destructive">{errors.start_date.message}</p>}
                    </div>
                    <div>
                      <Label className="mb-2">Date et heure de fin</Label>
                      <Input type="datetime-local" {...register('end_date')} />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2">Lieu</Label>
                    <Input placeholder="Nom du lieu" {...register('location')} />
                  </div>

                  <div>
                    <Label className="mb-2">Adresse complète</Label>
                    <Textarea placeholder="Adresse complète du lieu" rows={2} {...register('address')} />
                  </div>
                </FormSection>

                <FormSection title="Informations pratiques">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-2">Prix</Label>
                      <Input placeholder="Gratuit / 10€ / Sur inscription..." {...register('price')} />
                    </div>
                    <div>
                      <Label className="mb-2">Organisateur</Label>
                      <Input placeholder="Nom de l'organisateur" {...register('organizer')} />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-2">Lien externe</Label>
                    <Input type="url" placeholder="https://..." {...register('external_link')} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-2">Email de contact</Label>
                      <Input type="email" placeholder="contact@example.com" {...register('contact_email')} />
                    </div>
                    <div>
                      <Label className="mb-2">Téléphone</Label>
                      <Input placeholder="01 23 45 67 89" {...register('contact_phone')} />
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Inscription">
                  <Controller
                    name="registration_required"
                    control={control}
                    render={({ field }) => (
                      <FormCheckbox
                        label="Inscription requise"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label className="mb-2">Nombre maximum de participants</Label>
                      <Input type="number" placeholder="50" {...register('max_participants')} />
                    </div>
                    <div>
                      <Label className="mb-2">Date limite d'inscription</Label>
                      <Input type="datetime-local" {...register('registration_deadline')} />
                    </div>
                  </div>

                  <Controller
                    name="featured"
                    control={control}
                    render={({ field }) => (
                      <FormCheckbox
                        label="Événement à la une"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </FormSection>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => navigate('/events')}>Annuler</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {showPreview && (
            <div className={`sticky top-4 flex-[2] self-start ${mobileTab === 'edit' ? 'hidden lg:block' : ''}`}>
              <ContentPreview html={watchedDescription} title={watchedTitle} type="event" className="max-h-[calc(100vh-8rem)]" />
            </div>
          )}
        </div>
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

  if (isLoading) return <LoadingSpinner message="Chargement de l'événement..." />
  if (error || !event) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Événement non trouvé</p>
      </div>
    )
  }
  return <EventForm isEditing={true} initialData={event} />
}
