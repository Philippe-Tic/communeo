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
import { useArticle, useCreateArticle, useUpdateArticle, type Article } from '../hooks/api/useArticles'
import { toaster } from '../lib/toaster'

interface ArticleFormData {
  title: string
  content: string
  slug: string
  summary: string
  meta_description: string
  status: 'draft' | 'published' | 'archived'
  category: 'news' | 'event' | 'information' | 'emergency'
  author: string
  featured: boolean
}

interface ArticleFormProps {
  isEditing?: boolean
  initialData?: Article
}

export function ArticleForm({ isEditing = false, initialData }: ArticleFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createArticleMutation = useCreateArticle()
  const updateArticleMutation = useUpdateArticle()

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ArticleFormData>({
    defaultValues: {
      title: '',
      content: '',
      slug: '',
      summary: '',
      meta_description: '',
      status: 'draft',
      category: 'news',
      author: '',
      featured: false,
    },
  })

  const watchedTitle = watch('title')

  // Auto-générer le slug basé sur le titre
  useEffect(() => {
    if (watchedTitle && !isEditing) {
      const slug = watchedTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setValue('slug', slug)
    }
  }, [watchedTitle, setValue, isEditing])

  // Réinitialiser le formulaire avec les données initiales
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        content: initialData.content,
        slug: initialData.slug,
        summary: initialData.summary || '',
        meta_description: initialData.meta_description || '',
        status: initialData.status,
        category: initialData.category,
        author: initialData.author || '',
        featured: initialData.featured,
      })
    }
  }, [initialData, reset])

  const onSubmit = async (data: ArticleFormData) => {
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      if (isEditing && id) {
        const updateData = { id, ...data, status: data.status === 'archived' ? 'draft' as const : data.status }
        await updateArticleMutation.mutateAsync(updateData)
        toaster.create({
          title: 'Article mis à jour',
          description: 'L\'article a été mis à jour avec succès.',
          type: 'success',
          duration: 3000,
        })
      } else {
        const createData = { ...data, status: data.status === 'archived' ? 'draft' as const : data.status }
        await createArticleMutation.mutateAsync(createData)
        toaster.create({
          title: 'Article créé',
          description: 'L\'article a été créé avec succès.',
          type: 'success',
          duration: 3000,
        })
      }

      navigate('/articles')
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
            {isEditing ? 'Modifier l\'article' : 'Créer un nouvel article'}
          </Heading>
          <Button
            variant="outline"
            onClick={() => navigate('/articles')}
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
                    placeholder="Titre de l'article"
                    {...register('title', { required: 'Le titre est requis' })}
                  />
                  {errors.title && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.title.message}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Slug *</Text>
                  <Input
                    placeholder="slug-de-l-article"
                    {...register('slug', { required: 'Le slug est requis' })}
                  />
                  {errors.slug && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.slug.message}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Résumé</Text>
                  <Textarea
                    placeholder="Résumé de l'article"
                    rows={3}
                    {...register('summary')}
                  />
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Contenu *</Text>
                  <Textarea
                    placeholder="Contenu de l'article"
                    rows={15}
                    {...register('content', { required: 'Le contenu est requis' })}
                  />
                  {errors.content && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {errors.content.message}
                    </Text>
                  )}
                </Box>
              </Stack>
            </Box>

            {/* Catégorisation */}
            <Box>
              <Heading size="md" mb={4}>Catégorisation</Heading>
              <Stack gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={2}>Catégorie</Text>
                  <select {...register('category')} style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e2e8f0',
                    width: '100%'
                  }}>
                    <option value="news">Actualité</option>
                    <option value="event">Événement</option>
                    <option value="information">Information</option>
                    <option value="emergency">Urgence</option>
                  </select>
                </Box>

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
                  <Text fontWeight="medium" mb={2}>Auteur</Text>
                  <Input
                    placeholder="Nom de l'auteur"
                    {...register('author')}
                  />
                </Box>

                <Box display="flex" alignItems="center" gap={3}>
                  <Text fontWeight="medium">Article à la une</Text>
                  <input
                    type="checkbox"
                    {...register('featured')}
                  />
                </Box>
              </Stack>
            </Box>

            {/* SEO */}
            <Box>
              <Heading size="md" mb={4}>SEO</Heading>
              <Stack gap={4}>
                <Box>
                  <Text fontWeight="medium" mb={2}>Description SEO</Text>
                  <Textarea
                    placeholder="Description pour les moteurs de recherche"
                    rows={3}
                    {...register('meta_description')}
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Recommandé: 150-160 caractères
                  </Text>
                </Box>
              </Stack>
            </Box>

            {/* Actions */}
            <HStack justify="flex-end">
              <Button
                variant="outline"
                onClick={() => navigate('/articles')}
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

export function CreateArticle() {
  return <ArticleForm />
}

export function EditArticle() {
  const { id } = useParams<{ id: string }>()
  const { data: article, isLoading, error } = useArticle(id || '')

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="lg" />
      </Box>
    )
  }

  if (error || !article) {
    return (
      <Box p={4} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
        <Text color="red.700">Article non trouvé</Text>
      </Box>
    )
  }

  return <ArticleForm isEditing={true} initialData={article} />
}
