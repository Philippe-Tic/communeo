import { Button } from '@/components/ui/button'
import { toaster } from '../lib/toaster'

export function ToastTest() {
  const showSuccessToast = () => {
    toaster.create({
      title: 'Succès !',
      description: 'Cette action a été effectuée avec succès.',
      type: 'success',
      duration: 3000,
    })
  }

  const showErrorToast = () => {
    toaster.create({
      title: 'Erreur',
      description: 'Une erreur est survenue lors de l\'opération.',
      type: 'error',
      duration: 5000,
    })
  }

  const showWarningToast = () => {
    toaster.create({
      title: 'Attention',
      description: 'Veuillez vérifier vos informations.',
      type: 'warning',
      duration: 4000,
    })
  }

  const showInfoToast = () => {
    toaster.create({
      title: 'Information',
      description: 'Voici une information importante.',
      type: 'info',
      duration: 3000,
    })
  }

  const showLoadingToast = () => {
    toaster.create({
      title: 'Chargement...',
      description: 'Opération en cours.',
      type: 'loading',
      duration: 2000,
    })
  }

  return (
    <div className="mx-auto max-w-[600px] p-6">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Test du système de Toast</h1>

        <p className="text-muted-foreground">
          Cliquez sur les boutons ci-dessous pour tester les différents types de toast.
        </p>

        <div className="flex flex-wrap gap-4">
          <Button className="bg-green-600 text-white hover:bg-green-700" onClick={showSuccessToast}>
            Toast Succès
          </Button>
          <Button variant="destructive" onClick={showErrorToast}>
            Toast Erreur
          </Button>
          <Button className="bg-yellow-500 text-white hover:bg-yellow-600" onClick={showWarningToast}>
            Toast Attention
          </Button>
          <Button onClick={showInfoToast}>
            Toast Info
          </Button>
          <Button variant="secondary" onClick={showLoadingToast}>
            Toast Chargement
          </Button>
        </div>
      </div>
    </div>
  )
}
