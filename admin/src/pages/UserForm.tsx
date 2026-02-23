import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { LoadingSpinner, NotFoundBanner } from '../components/common'
import { FormCheckbox } from '../components/forms/FormCheckbox'
import { FormSection } from '../components/forms/FormSection'
import { FormSelect } from '../components/forms/FormSelect'
import { PageHeader } from '../components/layout'
import { useUser, useCreateUser, useUpdateUser, useAdminResetPassword, type SiteUser } from '../hooks/api/useUsers'
import { toaster } from '../lib/toaster'

interface UserFormData {
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  municipality_role: 'admin' | 'editor'
  active: boolean
}

interface UserFormProps {
  isEditing?: boolean
  initialData?: SiteUser
}

function UserForm({ isEditing = false, initialData }: UserFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const resetMutation = useAdminResetPassword()

  const handleResetPassword = async () => {
    if (!id) return
    try {
      await resetMutation.mutateAsync(Number(id))
      toaster.create({ title: 'Email envoyé', description: 'Un email de réinitialisation de mot de passe a été envoyé.', type: 'success', duration: 3000 })
    } catch (error: any) {
      toaster.create({ title: 'Erreur', description: error?.message || "Impossible d'envoyer l'email.", type: 'error', duration: 5000 })
    }
  }

  const defaultValues: UserFormData = initialData
    ? {
        username: initialData.username,
        email: initialData.email,
        first_name: initialData.first_name,
        last_name: initialData.last_name,
        phone: initialData.phone || '',
        municipality_role: initialData.municipality_role || 'editor',
        active: initialData.active ?? true,
      }
    : {
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        municipality_role: 'editor',
        active: true,
      }

  const { register, handleSubmit, formState: { errors }, control } = useForm<UserFormData>({
    defaultValues,
  })

  const onSubmit = async (data: UserFormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (isEditing && id) {
        const updateData: any = {
          id: Number(id),
          username: data.username,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || undefined,
          municipality_role: data.municipality_role,
          active: data.active,
        }
        await updateMutation.mutateAsync(updateData)
        toaster.create({ title: 'Utilisateur mis à jour', description: 'Les informations ont été mises à jour.', type: 'success', duration: 3000 })
      } else {
        await createMutation.mutateAsync({
          username: data.username,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || undefined,
          municipality_role: data.municipality_role,
          active: data.active,
        })
        toaster.create({ title: 'Invitation envoyée', description: "L'utilisateur recevra un email pour définir son mot de passe.", type: 'success', duration: 5000 })
      }
      navigate('/users')
    } catch (error: any) {
      const message = error?.error?.details?.error?.message || error?.error?.message || error?.message || 'Une erreur est survenue.'
      toaster.create({ title: 'Erreur', description: message, type: 'error', duration: 5000 })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEditing ? "Modifier l'utilisateur" : 'Inviter un utilisateur'}
          actions={[{ label: 'Retour', onClick: () => navigate('/users'), variant: 'outline' as const }]}
          breadcrumbs={[
            { label: 'Utilisateurs', href: '/users' },
            { label: isEditing ? 'Modifier' : 'Inviter' },
          ]}
        />

        {!isEditing && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              L'utilisateur recevra un email d'invitation pour définir son mot de passe et activer son compte.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            <FormSection title="Identifiants">
              <div>
                <Label className="mb-2">Nom d'utilisateur *</Label>
                <Input placeholder="nom.utilisateur" {...register('username', { required: "Le nom d'utilisateur est requis" })} />
                {errors.username && <p className="mt-1 text-sm text-destructive">{errors.username.message}</p>}
              </div>

              <div>
                <Label className="mb-2">Email *</Label>
                <Input type="email" placeholder="email@mairie.fr" {...register('email', { required: "L'email est requis" })} />
                {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
              </div>

            </FormSection>

            <FormSection title="Informations personnelles">
              <div>
                <Label className="mb-2">Prénom *</Label>
                <Input placeholder="Prénom" {...register('first_name', { required: 'Le prénom est requis' })} />
                {errors.first_name && <p className="mt-1 text-sm text-destructive">{errors.first_name.message}</p>}
              </div>

              <div>
                <Label className="mb-2">Nom *</Label>
                <Input placeholder="Nom" {...register('last_name', { required: 'Le nom est requis' })} />
                {errors.last_name && <p className="mt-1 text-sm text-destructive">{errors.last_name.message}</p>}
              </div>

              <div>
                <Label className="mb-2">Téléphone</Label>
                <Input placeholder="01 23 45 67 89" {...register('phone')} />
              </div>
            </FormSection>

            <FormSection title="Rôle et statut">
              <Controller
                name="municipality_role"
                control={control}
                render={({ field }) => (
                  <FormSelect
                    label="Rôle"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: 'admin', label: 'Administrateur' },
                      { value: 'editor', label: 'Rédacteur' },
                    ]}
                  />
                )}
              />

              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormCheckbox
                    label="Compte actif"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </FormSection>

            {isEditing && initialData && !initialData.blocked && (
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <p className="font-medium">Mot de passe</p>
                  <p className="text-sm text-muted-foreground">
                    Envoyer un email pour réinitialiser le mot de passe.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetPassword}
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? 'Envoi...' : 'Réinitialiser le mot de passe'}
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/users')}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Mettre à jour' : 'Envoyer l\'invitation'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CreateUser() {
  return <UserForm />
}

export function EditUser() {
  const { id } = useParams<{ id: string }>()
  const { data: user, isLoading, error } = useUser(Number(id) || 0)

  if (isLoading) return <LoadingSpinner message="Chargement de l'utilisateur..." />
  if (error || !user) {
    return <NotFoundBanner message="Utilisateur non trouvé" />
  }
  return <UserForm key={user.id} isEditing initialData={user} />
}
