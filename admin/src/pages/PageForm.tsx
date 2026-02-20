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
  const watchedParentId = watch('parent_id')

  // Décocher "Page d'accueil" si un parent est sélectionné
  useEffect(() => {
    if (watchedParentId) {
      setValue('is_homepage', false)
    }
  }, [watchedParentId, setValue])

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
        parent_id: initialData.parent_page?.documentId || '',
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
        parent_page: parent_id || null,
      }

      if (isEditing && id) {
        await updatePageMutation.mutateAsync({ id, ...apiData, template: apiData.template as 'default' | 'homepage' | 'about' | 'services' })
        toaster.create({
          title: 'Page mise à jour',
          description: 'La page a été mise à jour avec succès.',
          type: 'success',
          duration: 3000,
        })
      } else {
        await createPageMutation.mutateAsync({ ...apiData, template: apiData.template as 'default' | 'homepage' | 'about' | 'services' })
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
      return page.documentId !== initialData.documentId
    }
    return true
  })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEditing ? 'Modifier la page' : 'Créer une nouvelle page'}
          actions={[{ label: 'Retour', onClick: () => navigate('/pages'), variant: 'outline' }]}
          breadcrumbs={[
            { label: 'Pages', href: '/pages' },
            { label: isEditing ? 'Modifier' : 'Nouvelle' },
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
                    placeholder="Titre de la page"
                    {...register('title', { required: 'Le titre est requis' })}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Contenu *</Label>
                  <Textarea
                    placeholder="Contenu de la page"
                    rows={10}
                    {...register('content', { required: 'Le contenu est requis' })}
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-destructive">{errors.content.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Slug *</Label>
                  <Input
                    placeholder="slug-de-la-page"
                    {...register('slug', { required: 'Le slug est requis' })}
                  />
                  {errors.slug && (
                    <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Organisation */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Organisation</h2>
              <div className="flex flex-col gap-4">
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
                  <Label className="mb-2">Page parent</Label>
                  <select
                    {...register('parent_id')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Aucune (page racine)</option>
                    {availableParentPages.map((page: Page) => (
                      <option key={page.documentId} value={page.documentId}>
                        {page.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="mb-2">Ordre dans le menu</Label>
                  <Input
                    type="number"
                    {...register('menu_order', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label className="mb-2">Template</Label>
                  <select
                    {...register('template')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="default">Par défaut</option>
                    <option value="full-width">Pleine largeur</option>
                    <option value="sidebar">Avec barre latérale</option>
                  </select>
                </div>

                {!watchedParentId && (
                  <>
                    <div className="flex items-center gap-3">
                      <Label>Page d'accueil</Label>
                      <input
                        type="checkbox"
                        {...register('is_homepage')}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </div>

                    {watchedIsHomepage && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                        <p className="text-blue-700 dark:text-blue-300">Cette page sera définie comme page d'accueil du site.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* SEO */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">SEO</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Titre SEO</Label>
                  <Input
                    placeholder="Titre pour les moteurs de recherche"
                    {...register('seo_keywords')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Description SEO</Label>
                  <Textarea
                    placeholder="Description pour les moteurs de recherche"
                    rows={3}
                    {...register('meta_description')}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/pages')}>
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

export function CreatePage() {
  return <PageForm />
}

export function EditPage() {
  const { id } = useParams<{ id: string }>()
  const { data: page, isLoading, error } = usePage(id || '')

  if (isLoading) {
    return <LoadingSpinner message="Chargement de la page..." />
  }

  if (error || !page) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Page non trouvée</p>
      </div>
    )
  }

  return <PageForm isEditing={true} initialData={page} />
}
