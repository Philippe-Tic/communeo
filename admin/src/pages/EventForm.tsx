import {
    Box,
    Button,
    Heading,
    HStack,
    Input,
    Spinner,
    Stack,
    Text,
    Textarea,
    VStack
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
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
    <Box maxWidth="4xl" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading size="lg">
            {isEditing ? 'Modifier l\'événement' : 'Créer un nouvel événement'}
          </Heading>
          <Button
            variant="outline"
            onClick={() => navigate('/events')}
          >
            Retour
          </Button>
        </HStack>

        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={6}>
            {/* Informations de base */}
            <Box>
              <Heading size="md" mb={4}>Informations de base</Heading>
              <Stack gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={2}>Titre *</Text>
                  <Input
                    placeholder="Titre de l'événement"
                    {...register('title', { required: 'Le titre est requis' })}
                  />
                  {errors.title && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.title.message}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Description *</Text>
                  <Textarea
                    placeholder="Description de l'événement"
                    rows={8}
                    {...register('description', { required: 'La description est requise' })}
                  />
                  {errors.description && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.description.message}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Catégorie</Text>
                  <select {...register('category')} style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                    width: '100%'
                  }}>
                    <option value="cultural">Culturel</option>
                    <option value="sport">Sport</option>
                    <option value="meeting">Réunion</option>
                    <option value="celebration">Célébration</option>
                    <option value="workshop">Atelier</option>
                    <option value="conference">Conférence</option>
                  </select>
                </Box>
              </Stack>
            </Box>

            {/* Dates et lieu */}
            <Box>
              <Heading size="md" mb={4}>Dates et lieu</Heading>
              <Stack gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={2}>Date et heure de début *</Text>
                  <Input
                    type="datetime-local"
                    {...register('start_date', { required: 'La date de début est requise' })}
                  />
                  {errors.start_date && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.start_date.message}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Date et heure de fin</Text>
                  <Input
                    type="datetime-local"
                    {...register('end_date')}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Lieu</Text>
                  <Input
                    placeholder="Nom du lieu"
                    {...register('location')}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Adresse complète</Text>
                  <Textarea
                    placeholder="Adresse complète du lieu"
                    rows={3}
                    {...register('address')}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Informations pratiques */}
            <Box>
              <Heading size="md" mb={4}>Informations pratiques</Heading>
              <Stack gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={2}>Prix</Text>
                  <Input
                    placeholder="Gratuit / 10€ / Sur inscription..."
                    {...register('price')}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Lien externe</Text>
                  <Input
                    type="url"
                    placeholder="https://..."
                    {...register('external_link')}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Organisateur</Text>
                  <Input
                    placeholder="Nom de l'organisateur"
                    {...register('organizer')}
                  />
                </Box>

                <HStack gap={4}>
                  <Box flex={1}>
                    <Text fontWeight="medium" mb={2}>Email de contact</Text>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      {...register('contact_email')}
                    />
                  </Box>

                  <Box flex={1}>
                    <Text fontWeight="medium" mb={2}>Téléphone</Text>
                    <Input
                      placeholder="01 23 45 67 89"
                      {...register('contact_phone')}
                    />
                  </Box>
                </HStack>
              </Stack>
            </Box>

            {/* Inscription */}
            <Box>
              <Heading size="md" mb={4}>Inscription</Heading>
              <Stack gap={4}>
                <Box display="flex" alignItems="center" gap={3}>
                  <Text fontWeight="medium">Inscription requise</Text>
                  <input
                    type="checkbox"
                    {...register('registration_required')}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Nombre maximum de participants</Text>
                  <Input
                    type="number"
                    placeholder="50"
                    {...register('max_participants')}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Date limite d'inscription</Text>
                  <Input
                    type="datetime-local"
                    {...register('registration_deadline')}
                  />
                </Box>

                <Box display="flex" alignItems="center" gap={3}>
                  <Text fontWeight="medium">Événement à la une</Text>
                  <input
                    type="checkbox"
                    {...register('featured')}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Actions */}
            <HStack justify="flex-end">
              <Button
                variant="outline"
                onClick={() => navigate('/events')}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                loading={isSubmitting}
              >
                {isEditing ? 'Mettre à jour' : 'Créer'}
              </Button>
            </HStack>
          </Stack>
        </Box>
      </VStack>
    </Box>
  )
}

export function CreateEvent() {
  return <EventForm />
}

export function EditEvent() {
  const { id } = useParams<{ id: string }>()
  const { data: event, isLoading, error } = useEvent(id || '')

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="lg" />
      </Box>
    )
  }

  if (error || !event) {
    return (
      <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
        <Text color="red.700">Événement non trouvé</Text>
      </Box>
    )
  }

  return <EventForm isEditing={true} initialData={event} />
}
