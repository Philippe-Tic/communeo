import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useForgotPassword } from '../hooks/api/useAuth'

interface ForgotPasswordFormData {
  email: string
}

export const ForgotPassword = () => {
  const navigate = useNavigate()
  const forgotMutation = useForgotPassword()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>()

  const onSubmit = async (data: ForgotPasswordFormData) => {
    await forgotMutation.mutateAsync(data.email)
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center bg-background">
        <div className="mx-auto w-full max-w-[450px] px-4 sm:px-0">
          <div className="glass-card rounded-2xl p-6 md:p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h1 className="bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-xl font-extrabold text-transparent dark:from-indigo-400 dark:to-indigo-300 md:text-2xl">
                Email envoyé
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques minutes.
              </p>
              <Button className="mt-2 bg-gradient-to-r from-indigo-600 to-indigo-500 font-semibold text-white shadow-md hover:from-indigo-700 hover:to-indigo-600 dark:from-indigo-600 dark:to-indigo-500" onClick={() => navigate('/login')}>
                Retour à la connexion
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center bg-background">
      <div className="mx-auto w-full max-w-[450px] px-4 sm:px-0">
        <div className="glass-card rounded-2xl p-6 md:p-8">
          <div className="space-y-5 md:space-y-6">
            <div className="text-center">
              <h1 className="mb-2 bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-xl font-extrabold text-transparent dark:from-indigo-400 dark:to-indigo-300 md:text-2xl">
                Mot de passe oublié
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
            </div>

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

              <Button
                type="submit"
                className="mt-2 w-full bg-gradient-to-r from-indigo-600 to-indigo-500 font-semibold text-white shadow-md hover:from-indigo-700 hover:to-indigo-600 dark:from-indigo-600 dark:to-indigo-500"
                disabled={isSubmitting || forgotMutation.isPending}
              >
                {(isSubmitting || forgotMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Envoyer le lien
              </Button>
            </form>

            <div className="text-center">
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-primary hover:underline md:text-base"
              >
                ← Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
