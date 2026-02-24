import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TEAM_MEMBER_ROLE_OPTIONS } from '@/lib/constants/team-member-types'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner, NotFoundBanner } from '../components/common'
import { FormSection, FormSelect } from '../components/forms'
import { PageHeader } from '../components/layout'
import {
  uploadFile,
  useCreateTeamMember,
  useTeamMember,
  useUpdateTeamMember,
  type TeamMember,
  type TeamMemberRole,
} from '../hooks/api/useTeamMembers'
import { getMediaUrl } from '@/lib/utils'
import { toaster } from '../lib/toaster'

interface TeamMemberFormData {
  first_name: string
  last_name: string
  role: TeamMemberRole
  delegation: string
  bio: string
  display_order: number
}

interface TeamMemberFormProps {
  isEditing?: boolean
  initialData?: TeamMember
}

export function TeamMemberForm({ isEditing = false, initialData }: TeamMemberFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const createMutation = useCreateTeamMember()
  const updateMutation = useUpdateTeamMember()

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<TeamMemberFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      role: 'conseiller',
      delegation: '',
      bio: '',
      display_order: 0,
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        first_name: initialData.first_name,
        last_name: initialData.last_name,
        role: initialData.role,
        delegation: initialData.delegation || '',
        bio: initialData.bio || '',
        display_order: initialData.display_order,
      })
      if (initialData.photo) {
        setPhotoPreview(getMediaUrl(initialData.photo.url))
      }
    }
  }, [initialData, reset])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPhotoFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: TeamMemberFormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      let photoId: number | undefined
      if (photoFile) {
        const uploaded = await uploadFile(photoFile)
        photoId = uploaded.id
      }

      if (isEditing && id) {
        const updateData: Record<string, any> = {
          id,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          delegation: data.delegation || undefined,
          bio: data.bio || undefined,
          display_order: data.display_order,
        }
        if (photoId) updateData.photo = photoId
        await updateMutation.mutateAsync(updateData as any)
        toaster.create({
          title: 'Membre mis à jour',
          description: `${data.first_name} ${data.last_name} a été mis à jour avec succès.`,
          type: 'success',
          duration: 3000,
        })
      } else {
        const createData: Record<string, any> = {
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          delegation: data.delegation || undefined,
          bio: data.bio || undefined,
          display_order: data.display_order,
        }
        if (photoId) createData.photo = photoId
        await createMutation.mutateAsync(createData as any)
        toaster.create({
          title: 'Membre créé',
          description: `${data.first_name} ${data.last_name} a été ajouté avec succès.`,
          type: 'success',
          duration: 3000,
        })
      }

      navigate('/team-members')
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
          title={isEditing ? 'Modifier le membre' : 'Nouveau membre'}
          actions={[{ label: 'Retour', onClick: () => navigate('/team-members'), variant: 'outline' }]}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <FormSection title="Identité">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Prénom *</Label>
                  <Input
                    placeholder="Prénom"
                    {...register('first_name', { required: 'Le prénom est requis' })}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-destructive">{errors.first_name.message}</p>
                  )}
                </div>

                <div>
                  <Label className="mb-2">Nom *</Label>
                  <Input
                    placeholder="Nom"
                    {...register('last_name', { required: 'Le nom est requis' })}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-destructive">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                  name="role"
                  control={control}
                  rules={{ required: 'Le rôle est requis' }}
                  render={({ field }) => (
                    <FormSelect
                      label="Rôle"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={TEAM_MEMBER_ROLE_OPTIONS}
                      required
                      error={errors.role?.message}
                    />
                  )}
                />

                <div>
                  <Label className="mb-2">Délégation</Label>
                  <Input
                    placeholder="Ex: Urbanisme et travaux"
                    {...register('delegation')}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2">Biographie</Label>
                <Textarea
                  placeholder="Biographie du membre..."
                  rows={4}
                  {...register('bio')}
                />
              </div>
            </FormSection>

            <FormSection title="Photo">
              {photoPreview && (
                <div>
                  <img
                    src={photoPreview}
                    alt="Aperçu"
                    className="h-32 w-32 rounded-md object-cover"
                  />
                </div>
              )}
              <div>
                <Label className="mb-2">Photo du membre</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                {isEditing && initialData?.photo && !photoFile && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Photo actuelle conservée. Sélectionnez un fichier pour la remplacer.
                  </p>
                )}
              </div>
            </FormSection>

            <FormSection title="Affichage">
              <div>
                <Label className="mb-2">Ordre d'affichage</Label>
                <Input
                  type="number"
                  {...register('display_order', { valueAsNumber: true })}
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Les membres sont triés par ordre croissant (0 = premier affiché)
                </p>
              </div>
            </FormSection>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/team-members')}>
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

export function CreateTeamMember() {
  return <TeamMemberForm />
}

export function EditTeamMember() {
  const { id } = useParams<{ id: string }>()
  const { data: member, isLoading, error } = useTeamMember(id || '')

  if (isLoading) {
    return <LoadingSpinner message="Chargement du membre..." />
  }

  if (error || !member) {
    return <NotFoundBanner message="Membre non trouvé" />
  }

  return <TeamMemberForm isEditing={true} initialData={member} />
}
