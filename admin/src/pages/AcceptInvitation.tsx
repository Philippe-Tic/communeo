import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAcceptInvitation } from '../hooks/api/useUsers'

interface AcceptInvitationFormData {
  password: string
  passwordConfirmation: string
}

export const AcceptInvitation = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const isReset = searchParams.get('type') === 'reset'
  const navigate = useNavigate()
  const acceptMutation = useAcceptInvitation()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationFormData>()

  const password = watch('password')

  if (!token) {
    return (
      <div className="flex min-h-screen items-center bg-background">
        <div className="mx-auto w-full max-w-[450px] px-4">
          <div className="rounded-lg border bg-card p-6 shadow-lg md:p-8">
            <div className="text-center">
              <h1 className="mb-2 text-xl font-bold md:text-2xl">Lien invalide</h1>
              <p className="text-sm text-muted-foreground">
                Ce lien d'invitation est invalide. Veuillez contacter votre administrateur.
              </p>
              <Button className="mt-4" onClick={() => navigate('/login')}>
                Retour à la connexion
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center bg-background">
        <div className="mx-auto w-full max-w-[450px] px-4">
          <div className="rounded-lg border bg-card p-6 shadow-lg md:p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h1 className="text-xl font-bold md:text-2xl">
                {isReset ? 'Mot de passe réinitialisé' : 'Compte activé'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isReset
                  ? 'Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.'
                  : 'Votre mot de passe a été défini avec succès. Vous pouvez maintenant vous connecter.'}
              </p>
              <Button className="mt-2" onClick={() => navigate('/login')}>
                Se connecter
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: AcceptInvitationFormData) => {
    try {
      setError('')
      await acceptMutation.mutateAsync({
        token,
        password: data.password,
        passwordConfirmation: data.passwordConfirmation,
      })
      setSuccess(true)
    } catch (err: any) {
      const message = err?.error?.details?.error?.message || err?.error?.message || err?.message || 'Une erreur est survenue.'
      setError(message)
    }
  }

  return (
    <div className="flex min-h-screen items-center bg-background">
      <div className="mx-auto w-full max-w-[450px] px-4">
        <div className="rounded-lg border bg-card p-6 shadow-lg md:p-8">
          <div className="space-y-5 md:space-y-6">
            <div className="text-center">
              <h1 className="mb-2 text-xl font-bold md:text-2xl">
                {isReset ? 'Réinitialiser votre mot de passe' : 'Activer votre compte'}
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                {isReset
                  ? 'Choisissez un nouveau mot de passe.'
                  : "Définissez votre mot de passe pour accéder à votre espace d'administration."}
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium md:text-base">Mot de passe</label>
                <Input
                  type="password"
                  placeholder="Votre mot de passe"
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: {
                      value: 6,
                      message: 'Le mot de passe doit contenir au moins 6 caractères',
                    },
                  })}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium md:text-base">Confirmer le mot de passe</label>
                <Input
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  {...register('passwordConfirmation', {
                    required: 'La confirmation est requise',
                    validate: (value) =>
                      value === password || 'Les mots de passe ne correspondent pas',
                  })}
                />
                {errors.passwordConfirmation && (
                  <p className="text-sm text-destructive">{errors.passwordConfirmation.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={isSubmitting || acceptMutation.isPending}
              >
                {(isSubmitting || acceptMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isReset ? 'Réinitialiser' : 'Activer mon compte'}
              </Button>
            </form>

            <div className="text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-primary hover:underline"
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
