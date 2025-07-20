import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import deploymentService from '../services/deployment'
import { toaster } from '../lib/toaster'

// Query keys
export const DEPLOYMENT_QUERY_KEYS = {
  all: ['deployment'] as const,
  lists: () => [...DEPLOYMENT_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...DEPLOYMENT_QUERY_KEYS.lists(), filters] as const,
  details: () => [...DEPLOYMENT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...DEPLOYMENT_QUERY_KEYS.details(), id] as const,
  status: () => [...DEPLOYMENT_QUERY_KEYS.all, 'status'] as const,
}

/**
 * Hook pour gérer les déploiements
 */
export const useDeployment = () => {
  const queryClient = useQueryClient()
  const pollingIntervalRef = useRef<number | undefined>()

  // Query pour récupérer les déploiements
  const deploymentsQuery = useQuery({
    queryKey: DEPLOYMENT_QUERY_KEYS.list({}),
    queryFn: () => deploymentService.getDeployments(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Mutation pour déclencher un déploiement
  const triggerDeployMutation = useMutation({
    mutationFn: deploymentService.triggerDeploy,
    onSuccess: (data) => {
      toaster.create({
        title: 'Déploiement lancé',
        description: data.message,
        type: 'success',
        duration: 5000,
      })

      // Invalider et refetch immédiatement
      queryClient.invalidateQueries({ queryKey: DEPLOYMENT_QUERY_KEYS.all })

      // Démarrer le polling pour suivre le déploiement
      startPolling()
    },
    onError: (error: any) => {
      toaster.create({
        title: 'Erreur de déploiement',
        description: error?.error?.message || 'Une erreur est survenue lors du déploiement',
        type: 'error',
        duration: 8000,
      })
    },
  })

  // Mutation pour vérifier le statut d'un déploiement
  const checkStatusMutation = useMutation({
    mutationFn: deploymentService.checkDeploymentStatus,
    onSuccess: (data) => {
      // Mettre à jour le cache avec les nouvelles données
      queryClient.setQueryData(
        DEPLOYMENT_QUERY_KEYS.detail(data.data.deployment_id),
        data
      )

      // Si le déploiement est terminé, invalider la liste
      if (data.data.status !== 'building') {
        queryClient.invalidateQueries({ queryKey: DEPLOYMENT_QUERY_KEYS.all })

        // Arrêter le polling
        stopPolling()

        // Toast de notification selon le statut
        if (data.data.status === 'ready') {
          toaster.create({
            title: 'Déploiement terminé',
            description: 'Votre site a été déployé avec succès !',
            type: 'success',
            duration: 6000,
          })
        } else if (data.data.status === 'error') {
          toaster.create({
            title: 'Échec du déploiement',
            description: data.data.error_message || 'Le déploiement a échoué',
            type: 'error',
            duration: 10000,
          })
        }
      }
    },
  })

  // Démarrer le polling pour un déploiement en cours
  const startPolling = () => {
    stopPolling() // Arrêter le polling existant

    pollingIntervalRef.current = window.setInterval(() => {
      const deployments = deploymentsQuery.data?.data
      const buildingDeployment = deployments?.find((d: any) => d.status === 'building')

      if (buildingDeployment) {
        checkStatusMutation.mutate(buildingDeployment.deployment_id)
      } else {
        stopPolling()
      }
    }, 10000) // Vérifier toutes les 10 secondes
  }

  // Arrêter le polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = undefined
    }
  }

  // Nettoyage à la destruction du hook
  const cleanup = () => {
    stopPolling()
  }

  // État dérivé
  const deployments = deploymentsQuery.data?.data || []
  const currentDeployment = deployments[0] // Le plus récent
  const isDeploying = currentDeployment?.status === 'building'
  const isLoading = deploymentsQuery.isLoading || triggerDeployMutation.isPending

  return {
    // Données
    deployments,
    currentDeployment,
    isDeploying,
    isLoading,

    // État des queries
    deploymentsQuery,

    // Actions
    triggerDeploy: triggerDeployMutation.mutate,
    checkStatus: checkStatusMutation.mutate,
    refetch: deploymentsQuery.refetch,

    // État des mutations
    isTriggering: triggerDeployMutation.isPending,
    triggerError: triggerDeployMutation.error,

    // Utilitaires
    startPolling,
    stopPolling,
    cleanup,
  }
}

/**
 * Hook pour suivre un déploiement spécifique
 */
export const useDeploymentStatus = (deploymentId?: string) => {
  return useQuery({
    queryKey: DEPLOYMENT_QUERY_KEYS.detail(deploymentId!),
    queryFn: () => deploymentService.checkDeploymentStatus(deploymentId!),
    enabled: !!deploymentId,
    refetchInterval: 10000, // Poll every 10 seconds
  })
}

export default useDeployment
