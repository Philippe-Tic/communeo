import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import domainService from '../services/domain'
import { toaster } from '../lib/toaster'

// Query keys
export const DOMAIN_QUERY_KEYS = {
  all: ['domain'] as const,
  status: () => [...DOMAIN_QUERY_KEYS.all, 'status'] as const,
  diagnostic: (domain: string) => [...DOMAIN_QUERY_KEYS.all, 'diagnostic', domain] as const,
}

/**
 * Hook pour gérer les domaines personnalisés
 */
export const useDomain = () => {
  const queryClient = useQueryClient()

  // Query pour récupérer le statut du domaine
  const domainStatusQuery = useQuery({
    queryKey: DOMAIN_QUERY_KEYS.status(),
    queryFn: () => domainService.getDomainStatus(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Mutation pour configurer un domaine
  const configureDomainMutation = useMutation({
    mutationFn: domainService.configureDomain,
    onSuccess: (data) => {
      toaster.create({
        title: 'Domaine configuré',
        description: data.message,
        type: 'success',
        duration: 6000,
      })

      // Invalider le statut du domaine
      queryClient.invalidateQueries({ queryKey: DOMAIN_QUERY_KEYS.status() })
    },
    onError: (error: any) => {
      toaster.create({
        title: 'Erreur de configuration',
        description: error?.error?.message || 'Erreur lors de la configuration du domaine',
        type: 'error',
        duration: 8000,
      })
    },
  })

  // Mutation pour vérifier un domaine
  const verifyDomainMutation = useMutation({
    mutationFn: domainService.verifyDomain,
    onSuccess: (data) => {
      if (data.success) {
        toaster.create({
          title: 'Domaine vérifié',
          description: data.message,
          type: 'success',
          duration: 6000,
        })
      } else {
        toaster.create({
          title: 'Vérification en attente',
          description: data.hint || data.error || 'La vérification du domaine a échoué. La propagation DNS peut prendre jusqu\'à 48h.',
          type: 'warning',
          duration: 10000,
        })
      }

      // Invalider le statut du domaine
      queryClient.invalidateQueries({ queryKey: DOMAIN_QUERY_KEYS.status() })
    },
    onError: (error: any) => {
      toaster.create({
        title: 'Erreur de vérification',
        description: error?.error?.message || 'Erreur lors de la vérification du domaine',
        type: 'error',
        duration: 8000,
      })
    },
  })

  // Mutation pour supprimer un domaine
  const removeDomainMutation = useMutation({
    mutationFn: domainService.removeDomain,
    onSuccess: (data) => {
      if (data.success) {
        toaster.create({
          title: 'Domaine supprimé',
          description: data.message || 'Le domaine personnalisé a été supprimé',
          type: 'success',
          duration: 5000,
        })
      } else {
        toaster.create({
          title: 'Erreur de suppression',
          description: data.error || 'Erreur lors de la suppression du domaine',
          type: 'error',
          duration: 8000,
        })
      }

      // Invalider le statut du domaine
      queryClient.invalidateQueries({ queryKey: DOMAIN_QUERY_KEYS.status() })
    },
    onError: (error: any) => {
      toaster.create({
        title: 'Erreur de suppression',
        description: error?.error?.message || 'Erreur lors de la suppression du domaine',
        type: 'error',
        duration: 8000,
      })
    },
  })

  // État dérivé
  const domainStatus = domainStatusQuery.data
  const hasCustomDomain = domainStatus?.hasCustomDomain || false
  const isConfigured = domainStatus?.domainStatus === 'verified'
  const isPending = domainStatus?.domainStatus === 'pending' && hasCustomDomain
  const hasError = domainStatus?.domainStatus === 'error'
  const domainType = domainStatus?.domainType || null
  const isLoading = domainStatusQuery.isLoading ||
                   configureDomainMutation.isPending ||
                   verifyDomainMutation.isPending ||
                   removeDomainMutation.isPending

  return {
    // Données
    domainStatus,
    hasCustomDomain,
    isConfigured,
    isPending,
    hasError,
    domainType,
    isLoading,

    // État des queries
    domainStatusQuery,

    // Actions
    configureDomain: configureDomainMutation.mutate,
    verifyDomain: verifyDomainMutation.mutate,
    removeDomain: removeDomainMutation.mutate,
    refetch: domainStatusQuery.refetch,

    // État des mutations
    isConfiguring: configureDomainMutation.isPending,
    isVerifying: verifyDomainMutation.isPending,
    isRemoving: removeDomainMutation.isPending,

    // Erreurs
    configureError: configureDomainMutation.error,
    verifyError: verifyDomainMutation.error,
    removeError: removeDomainMutation.error,
  }
}

/**
 * Hook pour le diagnostic DNS d'un domaine
 */
export const useDomainDiagnostic = (domain?: string) => {
  return useQuery({
    queryKey: DOMAIN_QUERY_KEYS.diagnostic(domain!),
    queryFn: () => domainService.diagnoseDomain(domain!),
    enabled: !!domain,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export default useDomain
