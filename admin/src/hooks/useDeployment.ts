import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
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
  const prevDeployingRef = useRef(false)
  const [deployStartedAt, setDeployStartedAt] = useState<number | null>(null)

  // Query pour récupérer les déploiements
  // Polling dynamique : 10s pendant un build, 30s sinon
  const deploymentsQuery = useQuery({
    queryKey: DEPLOYMENT_QUERY_KEYS.list({}),
    queryFn: () => deploymentService.getDeployments(),
    staleTime: 1000 * 60 * 2,
    refetchInterval: (query) => {
      const deployments = query.state.data?.data
      const hasBuilding = deployments?.some((d: any) => d.status === 'building')
      return hasBuilding ? 10000 : 30000
    },
  })

  // État dérivé
  const deployments = deploymentsQuery.data?.data || []
  const currentDeployment = deployments[0]
  const isDeploying = currentDeployment?.status === 'building' || deployStartedAt !== null
  const isLoading = deploymentsQuery.isLoading

  // Détection de fin de déploiement
  useEffect(() => {
    if (prevDeployingRef.current && !isDeploying && currentDeployment) {
      if (currentDeployment.status === 'ready') {
        toaster.create({
          title: 'Déploiement terminé',
          description: 'Votre site a été déployé avec succès !',
          type: 'success',
          duration: 6000,
        })
      } else if (currentDeployment.status === 'error') {
        toaster.create({
          title: 'Échec du déploiement',
          description: currentDeployment.error_message || 'Le déploiement a échoué',
          type: 'error',
          duration: 10000,
        })
      }
    }
    prevDeployingRef.current = isDeploying
  }, [isDeploying, currentDeployment])

  // Reset optimistic state quand les données réelles rattrapent
  useEffect(() => {
    if (deployStartedAt === null) return

    if (currentDeployment?.status === 'building') {
      setDeployStartedAt(null)
      return
    }

    const timeout = setTimeout(() => setDeployStartedAt(null), 30000)
    return () => clearTimeout(timeout)
  }, [deployStartedAt, currentDeployment?.status])

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

      setDeployStartedAt(Date.now())
      queryClient.invalidateQueries({ queryKey: DEPLOYMENT_QUERY_KEYS.all })
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

  return {
    deployments,
    currentDeployment,
    isDeploying,
    isLoading,
    deploymentsQuery,
    triggerDeploy: triggerDeployMutation.mutate,
    isTriggering: triggerDeployMutation.isPending,
    triggerError: triggerDeployMutation.error,
    deployStartedAt,
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
    refetchInterval: 10000,
  })
}

export default useDeployment
