import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PageHeader } from '../components/layout'
import { useAuth } from '../hooks/useAuth'
import { useUpdateProfile, useRequestPasswordReset } from '../hooks/api/useProfile'
import { USER_ROLE_LABELS, USER_ROLE_COLORS } from '../lib/constants/user-types'
import { toaster } from '../lib/toaster'

interface ProfileFormData {
  first_name: string
  last_name: string
  phone: string
}

export const Profile = () => {
  const { user } = useAuth()
  const updateMutation = useUpdateProfile()
  const resetMutation = useRequestPasswordReset()
  const [editing, setEditing] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: (user as any)?.phone || '',
    },
  })

  if (!user) return null

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateMutation.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
      })
      toaster.create({ title: 'Profil mis à jour', type: 'success', duration: 3000 })
      setEditing(false)
    } catch (error: any) {
      toaster.create({
        title: 'Erreur',
        description: error?.message || 'Impossible de mettre à jour le profil.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleCancel = () => {
    reset({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: (user as any)?.phone || '',
    })
    setEditing(false)
  }

  const handleResetPassword = async () => {
    try {
      await resetMutation.mutateAsync()
      toaster.create({
        title: 'Email envoyé',
        description: 'Un email de réinitialisation de mot de passe vous a été envoyé.',
        type: 'success',
        duration: 5000,
      })
    } catch (error: any) {
      toaster.create({
        title: 'Erreur',
        description: error?.message || "Impossible d'envoyer l'email.",
        type: 'error',
        duration: 5000,
      })
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Mon profil"
          breadcrumbs={[{ label: 'Mon profil' }]}
        />

        {/* Information card */}
        <div className="rounded-md border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Informations personnelles</h2>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    {...register('first_name', { required: 'Le prénom est requis' })}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-destructive">{errors.first_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    {...register('last_name', { required: 'Le nom est requis' })}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive">{errors.last_name.message}</p>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="Ex: 06 12 34 56 78"
                  />
                </div>
              </div>

              {/* Read-only fields */}
              <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nom d'utilisateur</p>
                  <p className="font-medium">@{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rôle</p>
                  <Badge className={USER_ROLE_COLORS[user.municipality_role] || ''}>
                    {USER_ROLE_LABELS[user.municipality_role] || user.municipality_role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Site</p>
                  <p className="font-medium">{user.site?.name}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enregistrer
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Prénom</p>
                <p className="font-medium">{user.first_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium">{user.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nom d'utilisateur</p>
                <p className="font-medium">@{user.username}</p>
              </div>
              {(user as any)?.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{(user as any).phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Rôle</p>
                <Badge className={USER_ROLE_COLORS[user.municipality_role] || ''}>
                  {USER_ROLE_LABELS[user.municipality_role] || user.municipality_role}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Site</p>
                <p className="font-medium">{user.site?.name}</p>
              </div>
              {(user as any)?.createdAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Membre depuis</p>
                  <p className="text-sm">{formatDate((user as any).createdAt)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Password reset card */}
        <div className="flex items-center justify-between rounded-md border p-4">
          <div>
            <p className="font-medium">Mot de passe</p>
            <p className="text-sm text-muted-foreground">
              Recevoir un email pour réinitialiser votre mot de passe.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleResetPassword}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? 'Envoi...' : 'Réinitialiser mon mot de passe'}
          </Button>
        </div>
      </div>
    </div>
  )
}
