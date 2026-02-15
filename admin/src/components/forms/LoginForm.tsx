import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface LoginFormData {
  email: string
  password: string
}

interface LoginFormProps {
  onForgotPassword?: () => void
  onSignUp?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onForgotPassword,
  onSignUp,
}) => {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('')
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion'
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-[450px] px-4 sm:px-0">
      <div className="rounded-lg border bg-card p-6 shadow-lg md:p-8">
        <div className="space-y-5 md:space-y-6">
          <div className="text-center">
            <h1 className="mb-2 text-xl font-bold md:text-2xl">Connexion</h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Connectez-vous à votre espace d'administration
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium md:text-base">Email</label>
              <Input
                type="email"
                placeholder="votre@email.com"
                {...register('email', {
                  required: "L'email est requis",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Format d'email invalide",
                  },
                })}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

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

            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={isSubmitting || loading}
            >
              {(isSubmitting || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          <div className="space-y-2 text-center">
            {onForgotPassword && (
              <button
                onClick={onForgotPassword}
                className="text-sm text-primary hover:underline md:text-base"
              >
                Mot de passe oublié ?
              </button>
            )}
            {onSignUp && (
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{' '}
                <button
                  onClick={onSignUp}
                  className="text-sm text-primary hover:underline md:text-base"
                >
                  Créer un compte
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
