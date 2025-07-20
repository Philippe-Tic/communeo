import {
    Badge,
    Box,
    Button,
    Card,
    HStack,
    IconButton,
    Link,
    Separator,
    Table,
    Text,
    VStack
} from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import React, { useEffect } from 'react'
import { useDeployment } from '../../hooks/useDeployment'

interface DeploymentPanelProps {
  className?: string
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({ className }) => {
  const {
    deployments,
    currentDeployment,
    isDeploying,
    isLoading,
    triggerDeploy,
    refetch,
    isTriggering,
    triggerError,
    cleanup
  } = useDeployment()

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'building':
        return 'blue'
      case 'ready':
        return 'green'
      case 'error':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'building':
        return '⟳'
      case 'ready':
        return '✓'
      case 'error':
        return '✗'
      default:
        return '○'
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <Box className={className}>
      <Card.Root>
        <Card.Header>
          <Card.Title>Déploiement du site</Card.Title>
          <Card.Description>
            Publiez votre site pour mettre en ligne les dernières modifications
          </Card.Description>
        </Card.Header>

        <Card.Body>
          <VStack gap={6} align="stretch">
            {/* Section de déploiement principal */}
            <Box>
              <HStack justify="space-between" mb={4}>
                <VStack align="start" gap={1}>
                  <Text fontWeight="medium">État actuel</Text>
                  {currentDeployment ? (
                    <HStack>
                      <Badge colorPalette={getStatusColor(currentDeployment.status)}>
                        {getStatusIcon(currentDeployment.status)} {' '}
                        {currentDeployment.status === 'building' && 'En cours de déploiement'}
                        {currentDeployment.status === 'ready' && 'Site en ligne'}
                        {currentDeployment.status === 'error' && 'Échec du déploiement'}
                      </Badge>
                      {currentDeployment.site?.live_url && currentDeployment.status === 'ready' && (
                        <Link href={currentDeployment.site.live_url} target="_blank" color="blue.500">
                          ↗
                        </Link>
                      )}
                    </HStack>
                  ) : (
                    <Text color="gray.500">Aucun déploiement</Text>
                  )}
                </VStack>

                <HStack>
                  <IconButton
                    aria-label="Actualiser"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    ⟳
                  </IconButton>

                  <Button
                    colorPalette="green"
                    variant="solid"
                    onClick={() => triggerDeploy()}
                    loading={isTriggering}
                    disabled={isDeploying || isLoading}
                    size="md"
                  >
                    ▶ {isDeploying ? 'Déploiement en cours...' : 'Publier le site'}
                  </Button>
                </HStack>
              </HStack>

              {/* Progress bar pour déploiement en cours */}
              {isDeploying && (
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    Déploiement en cours... Cela peut prendre quelques minutes.
                  </Text>
                  <Box bg="blue.100" borderRadius="full" h={2} overflow="hidden">
                    <Box
                      bg="blue.500"
                      h="full"
                      w="full"
                      animation="pulse 2s infinite"
                    />
                  </Box>
                </Box>
              )}

              {/* Message d'erreur */}
              {triggerError && (
                <Box bg="red.50" border="1px" borderColor="red.200" borderRadius="md" p={3}>
                  <Text fontSize="sm" color="red.700">
                    Erreur : {(triggerError as any)?.error?.message || 'Erreur inconnue'}
                  </Text>
                </Box>
              )}
            </Box>

            <Separator />

            {/* Historique des déploiements */}
            <Box>
              <Text fontWeight="medium" mb={4}>Historique des déploiements</Text>

              {deployments.length > 0 ? (
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Statut</Table.ColumnHeader>
                      <Table.ColumnHeader>Déclenché par</Table.ColumnHeader>
                      <Table.ColumnHeader>Date</Table.ColumnHeader>
                      <Table.ColumnHeader>Durée</Table.ColumnHeader>
                      <Table.ColumnHeader>Actions</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {deployments.slice(0, 5).map((deployment) => (
                      <Table.Row key={deployment.id}>
                        <Table.Cell>
                          <Badge colorPalette={getStatusColor(deployment.status)}>
                            {getStatusIcon(deployment.status)} {' '}
                            {deployment.status === 'building' && 'En cours'}
                            {deployment.status === 'ready' && 'Réussi'}
                            {deployment.status === 'error' && 'Échec'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">
                            {deployment.triggered_by.first_name} {deployment.triggered_by.last_name}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">
                            {formatDistanceToNow(new Date(deployment.triggered_at), {
                              addSuffix: true,
                              locale: fr
                            })}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">
                            {formatDuration(deployment.build_time)}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          {deployment.deployment_url && (
                            <Link href={deployment.deployment_url} target="_blank" fontSize="sm">
                              ↗
                            </Link>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              ) : (
                <Box textAlign="center" py={8}>
                  <Text color="gray.500">Aucun déploiement effectué</Text>
                  <Text fontSize="sm" color="gray.400" mt={1}>
                    Cliquez sur "Publier le site" pour déployer votre site
                  </Text>
                </Box>
              )}
            </Box>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Box>
  )
}

export default DeploymentPanel
