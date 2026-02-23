import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DEPLOYMENT_STATUS_COLORS } from '@/lib/constants/deployment-types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Loader2, RefreshCw } from 'lucide-react'
import React, { useEffect } from 'react'
import { useDeployment } from '../../hooks/useDeployment'

interface DeploymentPanelProps {
  className?: string
}

const STATUS_ICONS: Record<string, string> = {
  building: '⟳', ready: '✓', error: '✗',
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({ className }) => {
  const {
    deployments, currentDeployment, isDeploying, isLoading,
    triggerDeploy, refetch, isTriggering, triggerError, cleanup
  } = useDeployment()

  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Déploiement du site</CardTitle>
          <CardDescription>Publiez votre site pour mettre en ligne les dernières modifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Deploy section */}
          <div>
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-medium">État actuel</p>
                {currentDeployment ? (
                  <div className="flex items-center gap-2">
                    <Badge className={DEPLOYMENT_STATUS_COLORS[currentDeployment.status] || ''}>
                      {STATUS_ICONS[currentDeployment.status] || '○'}{' '}
                      {currentDeployment.status === 'building' && 'En cours de déploiement'}
                      {currentDeployment.status === 'ready' && 'Site en ligne'}
                      {currentDeployment.status === 'error' && 'Échec du déploiement'}
                    </Badge>
                    {currentDeployment.site?.live_url && currentDeployment.status === 'ready' && (
                      <a href={currentDeployment.site.live_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">↗</a>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Aucun déploiement</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => triggerDeploy()} disabled={isDeploying || isLoading || isTriggering} className="bg-green-600 text-white hover:bg-green-700">
                  {isTriggering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  ▶ {isDeploying ? 'Déploiement en cours...' : 'Publier le site'}
                </Button>
              </div>
            </div>

            {isDeploying && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Déploiement en cours... Cela peut prendre quelques minutes.</p>
                <div className="h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900">
                  <div className="h-full w-full animate-pulse bg-primary" />
                </div>
              </div>
            )}

            {triggerError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">
                  Erreur : {(triggerError as any)?.error?.message || 'Erreur inconnue'}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* History */}
          <div>
            <p className="mb-4 font-medium">Historique des déploiements</p>
            {deployments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Déclenché par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.slice(0, 5).map((deployment) => (
                    <TableRow key={deployment.id}>
                      <TableCell>
                        <Badge className={DEPLOYMENT_STATUS_COLORS[deployment.status] || ''}>
                          {STATUS_ICONS[deployment.status] || '○'}{' '}
                          {deployment.status === 'building' && 'En cours'}
                          {deployment.status === 'ready' && 'Réussi'}
                          {deployment.status === 'error' && 'Échec'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {deployment.triggered_by
                          ? `${deployment.triggered_by.first_name} ${deployment.triggered_by.last_name}`
                          : 'Auto-deploy'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(deployment.triggered_at), { addSuffix: true, locale: fr })}
                      </TableCell>
                      <TableCell className="text-sm">{formatDuration(deployment.build_time)}</TableCell>
                      <TableCell>
                        {deployment.deployment_url && (
                          <a href={deployment.deployment_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">↗</a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">Aucun déploiement effectué</p>
                <p className="mt-1 text-sm text-muted-foreground">Cliquez sur "Publier le site" pour déployer votre site</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DeploymentPanel
