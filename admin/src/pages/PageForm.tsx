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
import { useCreatePage, usePage, usePages, useUpdatePage, type Page } from '../hooks/api/usePages'
import { toaster } from '../lib/toaster'

interface PageFormData {
  title: string
  content: string
  slug: string
  seo_keywords: string
  meta_description: string
  status: 'draft' | 'published' | 'archived'
  is_homepage: boolean
  parent_id?: string
  menu_order: number
  template: string
}

interface PageFormProps {
  isEditing?: boolean
  initialData?: Page
}

export function PageForm({ isEditing = false, initialData }: PageFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: pagesResponse } = usePages()
  const createPageMutation = useCreatePage()
  const updatePageMutation = useUpdatePage()

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<PageFormData>({
    defaultValues: {
      title: '',
      content: '',
      slug: '',
      seo_keywords: '',
      meta_description: '',
      status: 'draft',
      is_homepage: false,
      parent_id: '',
      menu_order: 0,
      template: 'default',
    },
  })

  const watchedTitle = watch('title')
  const watchedIsHomepage = watch('is_homepage')

  // Auto-générer le slug et le titre SEO basé sur le titre
  useEffect(() => {
    if (watchedTitle && !isEditing) {
      const slug = watchedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setValue('slug', slug)
      setValue('seo_keywords', watchedTitle)
    }
  }, [watchedTitle, setValue, isEditing])

  // Réinitialiser le formulaire avec les données initiales
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        content: initialData.content,
        slug: initialData.slug,
        seo_keywords: initialData.seo_keywords || initialData.title,
        meta_description: initialData.meta_description || '',
        status: initialData.status,
        is_homepage: initialData.is_homepage,
        parent_id: initialData.parent_page?.id?.toString() || '',
        menu_order: initialData.menu_order,
        template: initialData.template || 'default',
      })
    }
  }, [initialData, reset])

  const onSubmit = async (data: PageFormData) => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const { parent_id, ...formData } = data
      const apiData = {
        ...formData,
        parent: parent_id ? parseInt(parent_id) : undefined,
      }

      if (isEditing && id) {
        await updatePageMutation.mutateAsync({ id, ...apiData, template: apiData.template as 'default' | 'homepage' | 'contact' | 'about' | 'services' })
        toaster.create({
          title: 'Page mise à jour',
          description: 'La page a été mise à jour avec succès.',
          type: 'success',
          duration: 3000,
        })
      } else {
        await createPageMutation.mutateAsync({ ...apiData, template: apiData.template as 'default' | 'homepage' | 'contact' | 'about' | 'services', site: 1 })
        toaster.create({
          title: 'Page créée',
          description: 'La page a été créée avec succès.',
          type: 'success',
          duration: 3000,
        })
      }

      navigate('/pages')
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

  // Filtrer les pages pour éviter les cycles dans la hiérarchie
  const pages = pagesResponse?.data || []
  const availableParentPages = pages.filter((page: Page) => {
    if (isEditing && initialData) {
      return page.id !== initialData.id
    }
    return true
  })

  return (
    <Box maxWidth="4xl" mx="auto" p={6}>
      <VStack gap={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading size="lg">
            {isEditing ? 'Modifier la page' : 'Créer une nouvelle page'}
          </Heading>
          <Button
            variant="outline"
            onClick={() => navigate('/pages')}
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
                    placeholder="Titre de la page"
                    {...register('title', { required: 'Le titre est requis' })}
                  />
                  {errors.title && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.title.message}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Contenu *</Text>
                  <Textarea
                    placeholder="Contenu de la page"
                    rows={10}
                    {...register('content', { required: 'Le contenu est requis' })}
                  />
                  {errors.content && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.content.message}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Slug *</Text>
                  <Input
                    placeholder="slug-de-la-page"
                    {...register('slug', { required: 'Le slug est requis' })}
                  />
                  {errors.slug && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.slug.message}
                    </Text>
                  )}
                </Box>
              </Stack>
            </Box>

            {/* Organisation */}
            <Box>
              <Heading size="md" mb={4}>Organisation</Heading>
              <Stack gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={2}>Statut</Text>
                  <select {...register('status')} style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                    width: '100%'
                  }}>
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archivé</option>
                  </select>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Page parent</Text>
                  <select {...register('parent_id')} style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                    width: '100%'
                  }}>
                    <option value="">Aucune (page racine)</option>
                    {availableParentPages.map((page: Page) => (
                      <option key={page.id} value={page.id}>
                        {page.title}
                      </option>
                    ))}
                  </select>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Ordre dans le menu</Text>
                  <Input
                    type="number"
                    {...register('menu_order', { valueAsNumber: true })}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Template</Text>
                  <select {...register('template')} style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                    width: '100%'
                  }}>
                    <option value="default">Par défaut</option>
                    <option value="full-width">Pleine largeur</option>
                    <option value="sidebar">Avec barre latérale</option>
                  </select>
                </Box>

                <Box display="flex" alignItems="center" gap={3}>
                  <Text fontWeight="medium">Page d'accueil</Text>
                  <input
                    type="checkbox"
                    {...register('is_homepage')}
                    style={{ marginLeft: '0.5rem' }}
                  />
                </Box>

                {watchedIsHomepage && (
                  <Box p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                    <Text color="blue.700">Cette page sera définie comme page d'accueil du site.</Text>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* SEO */}
            <Box>
              <Heading size="md" mb={4}>SEO</Heading>
              <Stack gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={2}>Titre SEO</Text>
                  <Input
                    placeholder="Titre pour les moteurs de recherche"
                    {...register('seo_keywords')}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Description SEO</Text>
                  <Textarea
                    placeholder="Description pour les moteurs de recherche"
                    rows={3}
                    {...register('meta_description')}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Actions */}
            <HStack justify="flex-end">
              <Button
                variant="outline"
                onClick={() => navigate('/pages')}
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

export function CreatePage() {
  return <PageForm />
}

export function EditPage() {
  const { id } = useParams<{ id: string }>()
  const { data: page, isLoading, error } = usePage(id || '')

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="lg" />
      </Box>
    )
  }

  if (error || !page) {
    return (
      <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
        <Text color="red.700">Page non trouvée</Text>
      </Box>
    )
  }

  return <PageForm isEditing={true} initialData={page} />
}
