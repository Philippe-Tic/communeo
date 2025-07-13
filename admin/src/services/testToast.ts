import { toaster } from '../lib/toaster'

export const testToastService = {
  async simulateSuccess() {
    // Simuler un délai d'API
    await new Promise(resolve => setTimeout(resolve, 1000))

    toaster.create({
      title: 'Opération réussie !',
      description: 'L\'opération a été effectuée avec succès.',
      type: 'success',
      duration: 3000,
    })
  },

  async simulateError() {
    // Simuler un délai d'API
    await new Promise(resolve => setTimeout(resolve, 1000))

    toaster.create({
      title: 'Erreur',
      description: 'Une erreur s\'est produite lors de l\'opération.',
      type: 'error',
      duration: 5000,
    })
  },

  async simulateWarning() {
    toaster.create({
      title: 'Attention',
      description: 'Veuillez vérifier vos informations avant de continuer.',
      type: 'warning',
      duration: 4000,
    })
  },

  async simulateInfo() {
    toaster.create({
      title: 'Information',
      description: 'Voici une information importante concernant votre action.',
      type: 'info',
      duration: 3000,
    })
  },

  async simulateLoading() {
    toaster.create({
      title: 'Chargement...',
      description: 'Opération en cours, veuillez patienter.',
      type: 'loading',
      duration: 2000,
    })

    // Simuler une opération longue
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Afficher le succès après le chargement
    setTimeout(() => {
      toaster.create({
        title: 'Terminé !',
        description: 'L\'opération a été terminée avec succès.',
        type: 'success',
        duration: 3000,
      })
    }, 100)
  }
}

interface ToastOptions {
  title: string
  description: string
  status: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  isClosable?: boolean
}

// Fonction utilitaire pour migrer de useToast vers le nouveau système
export const migrateToast = (oldToastOptions: ToastOptions) => {
  const { title, description, status, duration = 5000 } = oldToastOptions

  return toaster.create({
    title,
    description,
    type: status, // Dans la v3, 'status' devient 'type'
    duration,
    // isClosable n'est plus nécessaire car les toasts sont fermables par défaut
  })
}

// Exemples d'utilisation pour remplacer useToast
export const toastExamples = {
  // Avant (v2)
  // const toast = useToast()
  // toast({ title: 'Succès', description: 'Action réussie', status: 'success' })

  // Après (v3)
  success: (title: string, description: string) => {
    toaster.create({
      title,
      description,
      type: 'success',
      duration: 3000,
    })
  },

  error: (title: string, description: string) => {
    toaster.create({
      title,
      description,
      type: 'error',
      duration: 5000,
    })
  },

  warning: (title: string, description: string) => {
    toaster.create({
      title,
      description,
      type: 'warning',
      duration: 4000,
    })
  },

  info: (title: string, description: string) => {
    toaster.create({
      title,
      description,
      type: 'info',
      duration: 3000,
    })
  }
}
