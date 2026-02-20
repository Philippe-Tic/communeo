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
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEditing ? 'Modifier l\'article' : 'Créer un nouvel article'}
          actions={[{ label: 'Retour', onClick: () => navigate('/articles'), variant: 'outline' }]}
          breadcrumbs={[
            { label: 'Articles', href: '/articles' },
            { label: isEditing ? 'Modifier' : 'Nouveau' },
          ]}
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
                    placeholder="Titre de l'article"
                    {...register('title', { required: 'Le titre est requis' })}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Slug *</Label>
                  <Input
                    placeholder="slug-de-l-article"
                    {...register('slug', { required: 'Le slug est requis' })}
                  />
                  {errors.slug && (
                    <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Résumé</Label>
                  <Textarea
                    placeholder="Résumé de l'article"
                    rows={3}
                    {...register('summary')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Contenu *</Label>
                  <Textarea
                    placeholder="Contenu de l'article"
                    rows={15}
                    {...register('content', { required: 'Le contenu est requis' })}
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-destructive">{errors.content.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Catégorisation */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Catégorisation</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Catégorie</Label>
                  <select
                    {...register('category')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="news">Actualité</option>
                    <option value="event">Événement</option>
                    <option value="information">Information</option>
                    <option value="emergency">Urgence</option>
                  </select>
                </div>

                <div>
                  <Label className="mb-2">Statut</Label>
                  <select
                    {...register('status')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>

                <div>
                  <Label className="mb-2">Auteur</Label>
                  <Input
                    placeholder="Nom de l'auteur"
                    {...register('author')}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Label>Article à la une</Label>
                  <input
                    type="checkbox"
                    {...register('featured')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* SEO */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">SEO</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Description SEO</Label>
                  <Textarea
                    placeholder="Description pour les moteurs de recherche"
                    rows={3}
                    {...register('meta_description')}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recommandé: 150-160 caractères
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/articles')}>
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

export function CreateArticle() {
  return <ArticleForm />
}

export function EditArticle() {
  const { id } = useParams<{ id: string }>()
  const { data: article, isLoading, error } = useArticle(id || '')

  if (isLoading) {
    return <LoadingSpinner message="Chargement de l'article..." />
  }

  if (error || !article) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Article non trouvé</p>
      </div>
    )
  }

  return <ArticleForm isEditing={true} initialData={article} />
}
