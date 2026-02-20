import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/common'
import { FormCheckbox } from '../components/forms/FormCheckbox'
import { FormSection } from '../components/forms/FormSection'
import { FormSelect } from '../components/forms/FormSelect'
import { RichTextEditor } from '../components/forms/RichTextEditor'
import { PageHeader } from '../components/layout'
import { SitePreview } from '../components/preview/SitePreview'
import { PreviewToolbar } from '../components/preview/PreviewToolbar'
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

const getDefaultValues = (data?: Page): PageFormData => ({
  title: data?.title ?? '',
  content: data?.content ?? '',
  slug: data?.slug ?? '',
  seo_keywords: data?.seo_keywords ?? data?.title ?? '',
  meta_description: data?.meta_description ?? '',
  status: data?.status ?? 'draft',
  is_homepage: data?.is_homepage ?? false,
  parent_id: data?.parent_page?.documentId ?? '',
  menu_order: data?.menu_order ?? 0,
  template: data?.template ?? 'default',
})

export function PageForm({ isEditing = false, initialData }: PageFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewWidth, setPreviewWidth] = useState(0)

  useEffect(() => {
    if (!showPreview || !previewRef.current) return
    const observer = new ResizeObserver((entries) => {
      setPreviewWidth(entries[0].contentRect.width)
    })
    observer.observe(previewRef.current)
    return () => observer.disconnect()
  }, [showPreview])

  const { data: pagesResponse } = usePages()
  const createPageMutation = useCreatePage()
  const updatePageMutation = useUpdatePage()

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm<PageFormData>({
    defaultValues: getDefaultValues(initialData),
  })

  const watchedTitle = watch('title')
  const watchedContent = watch('content')
  const watchedIsHomepage = watch('is_homepage')
  const watchedParentId = watch('parent_id')

  useEffect(() => {
    if (watchedParentId) {
      setValue('is_homepage', false)
    }
  }, [watchedParentId, setValue])

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

  useEffect(() => {
    if (initialData) {
      reset(getDefaultValues(initialData))
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
        toaster.create({ title: 'Page mise à jour', description: 'La page a été mise à jour avec succès.', type: 'success', duration: 3000 })
      } else {
        await createPageMutation.mutateAsync({ ...apiData, template: apiData.template as 'default' | 'homepage' | 'about' | 'services' })
        toaster.create({ title: 'Page créée', description: 'La page a été créée avec succès.', type: 'success', duration: 3000 })
      }
      navigate('/pages')
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toaster.create({ title: 'Erreur', description: 'Une erreur est survenue lors de la sauvegarde.', type: 'error', duration: 5000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  const pages = pagesResponse?.data || []
  const availableParentPages = pages.filter((page: Page) => {
    if (isEditing && initialData) return page.documentId !== initialData.documentId
    return true
  })

  const parentOptions = [
    { value: '_none', label: 'Aucune (page racine)' },
    ...availableParentPages.map((page: Page) => ({
      value: page.documentId,
      label: page.title,
    })),
  ]

  return (
    <div className={showPreview ? 'mx-auto max-w-[1600px]' : 'mx-auto max-w-4xl'}>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEditing ? 'Modifier la page' : 'Créer une nouvelle page'}
          actions={showPreview ? [] : [
            {
              label: 'Aperçu',
              onClick: () => setShowPreview(true),
              variant: 'outline' as const,
              className: 'hidden lg:inline-flex',
            },
            { label: 'Retour', onClick: () => navigate('/pages'), variant: 'outline' as const },
          ]}
          breadcrumbs={[
            { label: 'Pages', href: '/pages' },
            { label: isEditing ? 'Modifier' : 'Nouvelle' },
          ]}
        />

        <div className={showPreview ? 'flex gap-6' : ''}>
          <div className={showPreview ? 'flex-[2]' : ''}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-6">
                <FormSection title="Informations de base">
                  <div>
                    <Label className="mb-2">Titre *</Label>
                    <Input placeholder="Titre de la page" {...register('title', { required: 'Le titre est requis' })} />
                    {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>}
                  </div>

                  <div>
                    <Label className="mb-2">Contenu *</Label>
                    <Controller
                      name="content"
                      control={control}
                      rules={{ required: 'Le contenu est requis' }}
                      render={({ field }) => (
                        <RichTextEditor variant="full" value={field.value} onChange={field.onChange} placeholder="Contenu de la page" error={!!errors.content} />
                      )}
                    />
                    {errors.content && <p className="mt-1 text-sm text-destructive">{errors.content.message}</p>}
                  </div>

                  <div>
                    <Label className="mb-2">Slug *</Label>
                    <Input placeholder="slug-de-la-page" {...register('slug', { required: 'Le slug est requis' })} />
                    {errors.slug && <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>}
                  </div>
                </FormSection>

                <FormSection title="Organisation">
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

                  <Controller
                    name="parent_id"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        label="Page parent"
                        value={field.value || '_none'}
                        onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                        options={parentOptions}
                      />
                    )}
                  />

                  <div>
                    <Label className="mb-2">Ordre dans le menu</Label>
                    <Input type="number" {...register('menu_order', { valueAsNumber: true })} />
                  </div>

                  <Controller
                    name="template"
                    control={control}
                    render={({ field }) => (
                      <FormSelect
                        label="Template"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: 'default', label: 'Par défaut' },
                          { value: 'homepage', label: "Page d'accueil" },
                          { value: 'about', label: 'À propos' },
                          { value: 'services', label: 'Services' },
                        ]}
                      />
                    )}
                  />

                  {!watchedParentId && (
                    <>
                      <Controller
                        name="is_homepage"
                        control={control}
                        render={({ field }) => (
                          <FormCheckbox
                            label="Page d'accueil"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />

                      {watchedIsHomepage && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                          <p className="text-blue-700 dark:text-blue-300">Cette page sera définie comme page d'accueil du site.</p>
                        </div>
                      )}
                    </>
                  )}
                </FormSection>

                <FormSection title="SEO">
                  <div>
                    <Label className="mb-2">Titre SEO</Label>
                    <Input placeholder="Titre pour les moteurs de recherche" {...register('seo_keywords')} />
                  </div>

                  <div>
                    <Label className="mb-2">Description SEO</Label>
                    <Textarea placeholder="Description pour les moteurs de recherche" rows={3} {...register('meta_description')} />
                  </div>
                </FormSection>

                <div className="flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => navigate('/pages')}>Annuler</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {showPreview && (
            <div ref={previewRef} className="flex-[3]">
              <div
                className="fixed top-[104px] bottom-4"
                style={previewWidth > 0 ? { width: `${previewWidth}px` } : undefined}
              >
                <PreviewToolbar
                  actions={<>
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>Masquer l'aperçu</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/pages')}>Retour</Button>
                  </>}
                >
                  <SitePreview content={watchedContent} title={watchedTitle} contentType="page" />
                </PreviewToolbar>
              </div>
            </div>
          )}
        </div>
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

  if (isLoading) return <LoadingSpinner message="Chargement de la page..." />
  if (error || !page) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Page non trouvée</p>
      </div>
    )
  }
  return <PageForm isEditing={true} initialData={page} />
}
