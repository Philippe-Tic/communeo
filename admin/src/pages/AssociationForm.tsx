import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ASSOCIATION_CATEGORY_OPTIONS } from '@/lib/constants/association-types'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner, NotFoundBanner } from '../components/common'
import { FormSection, FormSelect } from '../components/forms'
import { PageHeader } from '../components/layout'
import {
  uploadFile,
  useAssociation,
  useCreateAssociation,
  useUpdateAssociation,
  type Association,
  type AssociationCategory,
} from '../hooks/api/useAssociations'
import { toaster } from '../lib/toaster'

interface AssociationFormData {
  name: string
  category: AssociationCategory
  description: string
  contact_name: string
  contact_email: string
  contact_phone: string
  website: string
  address: string
}

interface AssociationFormProps {
  isEditing?: boolean
  initialData?: Association
}

export function AssociationForm({ isEditing = false, initialData }: AssociationFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const createMutation = useCreateAssociation()
  const updateMutation = useUpdateAssociation()

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<AssociationFormData>({
    defaultValues: {
      name: '',
      category: 'autre',
      description: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      address: '',
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        category: initialData.category,
        description: initialData.description || '',
        contact_name: initialData.contact_name || '',
        contact_email: initialData.contact_email || '',
        contact_phone: initialData.contact_phone || '',
        website: initialData.website || '',
        address: initialData.address || '',
      })
      if (initialData.logo) {
        setLogoPreview(initialData.logo.url)
      }
    }
  }, [initialData, reset])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setLogoFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: AssociationFormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      let logoId: number | undefined
      if (logoFile) {
        const uploaded = await uploadFile(logoFile)
        logoId = uploaded.id
      }

      if (isEditing && id) {
        const updateData: Record<string, any> = {
          id,
          name: data.name,
          category: data.category,
          description: data.description || undefined,
          contact_name: data.contact_name || undefined,
          contact_email: data.contact_email || undefined,
          contact_phone: data.contact_phone || undefined,
          website: data.website || undefined,
          address: data.address || undefined,
        }
        if (logoId) updateData.logo = logoId
        await updateMutation.mutateAsync(updateData as any)
        toaster.create({
          title: 'Association mise à jour',
          description: `${data.name} a été mise à jour avec succès.`,
          type: 'success',
          duration: 3000,
        })
      } else {
        const createData: Record<string, any> = {
          name: data.name,
          category: data.category,
          description: data.description || undefined,
          contact_name: data.contact_name || undefined,
          contact_email: data.contact_email || undefined,
          contact_phone: data.contact_phone || undefined,
          website: data.website || undefined,
          address: data.address || undefined,
        }
        if (logoId) createData.logo = logoId
        await createMutation.mutateAsync(createData as any)
        toaster.create({
          title: 'Association créée',
          description: `${data.name} a été ajoutée avec succès.`,
          type: 'success',
          duration: 3000,
        })
      }

      navigate('/associations')
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
          title={isEditing ? 'Modifier l\'association' : 'Nouvelle association'}
          actions={[{ label: 'Retour', onClick: () => navigate('/associations'), variant: 'outline' }]}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <FormSection title="Informations générales">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Nom de l'association *</Label>
                  <Input
                    placeholder="Nom de l'association"
                    {...register('name', { required: 'Le nom est requis' })}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <Controller
                  name="category"
                  control={control}
                  rules={{ required: 'La catégorie est requise' }}
                  render={({ field }) => (
                    <FormSelect
                      label="Catégorie"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={ASSOCIATION_CATEGORY_OPTIONS}
                      required
                      error={errors.category?.message}
                    />
                  )}
                />
              </div>

              <div>
                <Label className="mb-2">Description</Label>
                <Textarea
                  placeholder="Description de l'association..."
                  rows={4}
                  {...register('description')}
                />
              </div>
            </FormSection>

            <FormSection title="Contact">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Personne de contact</Label>
                  <Input
                    placeholder="Nom du contact"
                    {...register('contact_name')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Email de contact</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    {...register('contact_email')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Téléphone</Label>
                  <Input
                    placeholder="01 23 45 67 89"
                    {...register('contact_phone')}
                  />
                </div>

                <div>
                  <Label className="mb-2">Site web</Label>
                  <Input
                    placeholder="https://www.example.com"
                    {...register('website')}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2">Adresse</Label>
                <Textarea
                  placeholder="Adresse de l'association"
                  rows={2}
                  {...register('address')}
                />
              </div>
            </FormSection>

            <FormSection title="Logo">
              {logoPreview && (
                <div>
                  <img
                    src={logoPreview}
                    alt="Aperçu"
                    className="h-24 w-24 rounded-md object-contain"
                  />
                </div>
              )}
              <div>
                <Label className="mb-2">Logo de l'association</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                {isEditing && initialData?.logo && !logoFile && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Logo actuel conservé. Sélectionnez un fichier pour le remplacer.
                  </p>
                )}
              </div>
            </FormSection>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/associations')}>
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

export function CreateAssociation() {
  return <AssociationForm />
}

export function EditAssociation() {
  const { id } = useParams<{ id: string }>()
  const { data: association, isLoading, error } = useAssociation(id || '')

  if (isLoading) {
    return <LoadingSpinner message="Chargement de l'association..." />
  }

  if (error || !association) {
    return <NotFoundBanner message="Association non trouvée" />
  }

  return <AssociationForm isEditing={true} initialData={association} />
}
