import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  uploadFile,
  useCreateOfficialDocument,
  useOfficialDocument,
  useUpdateOfficialDocument,
  type OfficialDocument,
} from '../hooks/api/useOfficialDocuments'
import { DOCUMENT_TYPE_OPTIONS } from '../lib/official-document-types'
import { toaster } from '../lib/toaster'

interface OfficialDocumentFormData {
  title: string
  slug: string
  description: string
  document_type: string
  document_date: string
  session_date: string
  status: 'draft' | 'published' | 'archived'
  reference_number: string
  year: number
}

interface OfficialDocumentFormProps {
  isEditing?: boolean
  initialData?: OfficialDocument
}

const selectClassName = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function OfficialDocumentForm({ isEditing = false, initialData }: OfficialDocumentFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mainFile, setMainFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])
  const mainFileRef = useRef<HTMLInputElement>(null)
  const additionalFilesRef = useRef<HTMLInputElement>(null)

  const createMutation = useCreateOfficialDocument()
  const updateMutation = useUpdateOfficialDocument()

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<OfficialDocumentFormData>({
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      document_type: 'deliberation',
      document_date: '',
      session_date: '',
      status: 'draft',
      reference_number: '',
      year: new Date().getFullYear(),
    },
  })

  const watchedTitle = watch('title')

  // Auto-generate slug from title
  useEffect(() => {
    if (watchedTitle && !isEditing) {
      const slug = watchedTitle
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setValue('slug', slug)
    }
  }, [watchedTitle, setValue, isEditing])

  // Reset form with initial data
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title,
        slug: initialData.slug,
        description: initialData.description || '',
        document_type: initialData.document_type,
        document_date: initialData.document_date,
        session_date: initialData.session_date || '',
        status: initialData.status,
        reference_number: initialData.reference_number || '',
        year: initialData.year,
      })
    }
  }, [initialData, reset])

  const onSubmit = async (data: OfficialDocumentFormData) => {
    if (isSubmitting) return

    // Require main file for creation
    if (!isEditing && !mainFile) {
      toaster.create({
        title: 'Fichier requis',
        description: 'Veuillez sélectionner un fichier PDF pour le document principal.',
        type: 'error',
        duration: 5000,
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Upload main file if provided
      let fileId: number | undefined
      if (mainFile) {
        const uploaded = await uploadFile(mainFile)
        fileId = uploaded.id
      }

      // Upload additional files if provided
      let additionalFileIds: number[] | undefined
      if (additionalFiles.length > 0) {
        const uploadedFiles = await Promise.all(additionalFiles.map(f => uploadFile(f)))
        additionalFileIds = uploadedFiles.map(f => f.id)
      }

      if (isEditing && id) {
        const updateData: Record<string, any> = {
          id,
          title: data.title,
          slug: data.slug,
          description: data.description || undefined,
          document_type: data.document_type,
          document_date: data.document_date,
          session_date: data.session_date || undefined,
          status: data.status,
          reference_number: data.reference_number || undefined,
          year: data.year,
        }
        if (fileId) updateData.file = fileId
        if (additionalFileIds) updateData.additional_files = additionalFileIds
        await updateMutation.mutateAsync(updateData as any)
        toaster.create({
          title: 'Document mis à jour',
          description: 'Le document a été mis à jour avec succès.',
          type: 'success',
          duration: 3000,
        })
      } else {
        await createMutation.mutateAsync({
          title: data.title,
          slug: data.slug,
          description: data.description || undefined,
          document_type: data.document_type,
          document_date: data.document_date,
          session_date: data.session_date || undefined,
          file: fileId!,
          additional_files: additionalFileIds,
          status: data.status,
          reference_number: data.reference_number || undefined,
          year: data.year,
        })
        toaster.create({
          title: 'Document créé',
          description: 'Le document a été créé avec succès.',
          type: 'success',
          duration: 3000,
        })
      }

      navigate('/documents')
    } catch {
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
          title={isEditing ? 'Modifier le document' : 'Nouveau document officiel'}
          actions={[{ label: 'Retour', onClick: () => navigate('/documents'), variant: 'outline' }]}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            {/* Informations */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Informations</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Titre *</Label>
                  <Input
                    placeholder="Titre du document"
                    {...register('title', { required: 'Le titre est requis' })}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Slug *</Label>
                  <Input
                    placeholder="slug-du-document"
                    {...register('slug', { required: 'Le slug est requis' })}
                  />
                  {errors.slug && (
                    <p className="mt-1 text-sm text-destructive">{errors.slug.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Description</Label>
                  <Textarea
                    placeholder="Description du document"
                    rows={3}
                    {...register('description')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Numéro de référence</Label>
                  <Input
                    placeholder="Ex: DEL-2024-042"
                    {...register('reference_number')}
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Classification</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Type de document *</Label>
                  <select
                    {...register('document_type', { required: 'Le type est requis' })}
                    className={selectClassName}
                  >
                    {DOCUMENT_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {errors.document_type && (
                    <p className="mt-1 text-sm text-destructive">{errors.document_type.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <Label className="mb-2">Année *</Label>
                    <Input
                      type="number"
                      {...register('year', {
                        required: "L'année est requise",
                        valueAsNumber: true,
                        min: { value: 1900, message: 'Année invalide' },
                        max: { value: 2100, message: 'Année invalide' },
                      })}
                    />
                    {errors.year && (
                      <p className="mt-1 text-sm text-destructive">{errors.year.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-2">Date du document *</Label>
                    <Input
                      type="date"
                      {...register('document_date', { required: 'La date est requise' })}
                    />
                    {errors.document_date && (
                      <p className="mt-1 text-sm text-destructive">{errors.document_date.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-2">Date de session</Label>
                    <Input
                      type="date"
                      {...register('session_date')}
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-2">Statut</Label>
                  <select
                    {...register('status')}
                    className={selectClassName}
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Fichiers */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Fichiers</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <Label className="mb-2">Document principal (PDF) {!isEditing && '*'}</Label>
                  <Input
                    ref={mainFileRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setMainFile(e.target.files?.[0] || null)}
                  />
                  {isEditing && initialData?.file && !mainFile && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Fichier actuel : {initialData.file.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Annexes (optionnel)</Label>
                  <Input
                    ref={additionalFilesRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                    onChange={(e) => setAdditionalFiles(Array.from(e.target.files || []))}
                  />
                  {additionalFiles.length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {additionalFiles.length} fichier{additionalFiles.length > 1 ? 's' : ''} sélectionné{additionalFiles.length > 1 ? 's' : ''}
                    </p>
                  )}
                  {isEditing && initialData?.additional_files && initialData.additional_files.length > 0 && additionalFiles.length === 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {initialData.additional_files.length} annexe{initialData.additional_files.length > 1 ? 's' : ''} actuelle{initialData.additional_files.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/documents')}>
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

export function CreateOfficialDocument() {
  return <OfficialDocumentForm />
}

export function EditOfficialDocument() {
  const { id } = useParams<{ id: string }>()
  const { data: document, isLoading, error } = useOfficialDocument(id || '')

  if (isLoading) {
    return <LoadingSpinner message="Chargement du document..." />
  }

  if (error || !document) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Document non trouvé</p>
      </div>
    )
  }

  return <OfficialDocumentForm isEditing={true} initialData={document} />
}
