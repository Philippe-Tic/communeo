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
  const [showPreview, setShowPreview] = useState(false)
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit')

  const createArticleMutation = useCreateArticle()
  const updateArticleMutation = useUpdateArticle()

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm<ArticleFormData>({
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
  const watchedContent = watch('content')

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
        toaster.create({ title: 'Article mis à jour', description: 'L\'article a été mis à jour avec succès.', type: 'success', duration: 3000 })
      } else {
        const createData = { ...data, status: data.status === 'archived' ? 'draft' as const : data.status }
        await createArticleMutation.mutateAsync(createData)
        toaster.create({ title: 'Article créé', description: 'L\'article a été créé avec succès.', type: 'success', duration: 3000 })
      }
      navigate('/articles')
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
          title={isEditing ? 'Modifier l\'article' : 'Créer un nouvel article'}
          actions={[
            {
              label: showPreview ? 'Masquer l\'aperçu' : 'Aperçu',
              onClick: () => setShowPreview(!showPreview),
              variant: showPreview ? 'solid' : 'outline',
            },
            { label: 'Retour', onClick: () => navigate('/articles'), variant: 'outline' },
          ]}
          breadcrumbs={[
            { label: 'Articles', href: '/articles' },
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
                <FormSection title="Informations de base">
                  <div>
                    <Label className="mb-2">Titre *</Label>
                    <Input placeholder="Titre de l'article" {...register('title', { required: 'Le titre est requis' })} />
                    {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
                  </div>

                  <div>
                    <Label className="mb-2">Slug *</Label>
                    <Input placeholder="slug-de-l-article" {...register('slug', { required: 'Le slug est requis' })} />
                    {errors.slug && <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>}
                  </div>

                  <div>
                    <Label className="mb-2">Résumé</Label>
                    <Textarea placeholder="Résumé de l'article" rows={3} {...register('summary')} />
                  </div>

                  <div>
                    <Label className="mb-2">Contenu *</Label>
                    <Controller
                      name="content"
                      control={control}
                      rules={{ required: 'Le contenu est requis' }}
                      render={({ field }) => (
                        <RichTextEditor variant="full" value={field.value} onChange={field.onChange} placeholder="Contenu de l'article" error={!!errors.content} />
                      )}
                    />
                    {errors.content && <p className="mt-1 text-sm text-destructive">{errors.content.message}</p>}
                  </div>
                </FormSection>

                <FormSection title="Catégorisation">
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        label="Catégorie"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: 'news', label: 'Actualité' },
                          { value: 'event', label: 'Événement' },
                          { value: 'information', label: 'Information' },
                          { value: 'emergency', label: 'Urgence' },
                        ]}
                      />
                    )}
                  />

                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        label="Statut"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: 'draft', label: 'Brouillon' },
                          { value: 'published', label: 'Publié' },
                          { value: 'archived', label: 'Archivé' },
                        ]}
                      />
                    )}
                  />

                  <div>
                    <Label className="mb-2">Auteur</Label>
                    <Input placeholder="Nom de l'auteur" {...register('author')} />
                  </div>

                  <Controller
                    name="featured"
                    control={control}
                    render={({ field }) => (
                      <FormCheckbox
                        label="Article à la une"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </FormSection>

                <FormSection title="SEO">
                  <div>
                    <Label className="mb-2">Description SEO</Label>
                    <Textarea placeholder="Description pour les moteurs de recherche" rows={3} {...register('meta_description')} />
                    <p className="mt-1 text-xs text-muted-foreground">Recommandé: 150-160 caractères</p>
                  </div>
                </FormSection>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => navigate('/articles')}>Annuler</Button>
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
              <ContentPreview html={watchedContent} title={watchedTitle} type="article" className="max-h-[calc(100vh-8rem)]" />
            </div>
          )}
        </div>
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

  if (isLoading) return <LoadingSpinner message="Chargement de l'article..." />
  if (error || !article) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Article non trouvé</p>
      </div>
    )
  }
  return <ArticleForm isEditing={true} initialData={article} />
}
