import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DEPLOYMENT_STATUS_COLORS } from '@/lib/constants/deployment-types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ExternalLink, Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
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
    triggerDeploy, isTriggering, triggerError, deployStartedAt
  } = useDeployment()

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Timer pour le temps écoulé pendant le build
  useEffect(() => {
    if (!isDeploying) {
      setElapsedSeconds(0)
      return
    }

    // Calculer le temps initial depuis triggered_at (gère le refresh mid-build)
    const triggeredAt =
      currentDeployment?.status === 'building' && currentDeployment?.triggered_at
        ? new Date(currentDeployment.triggered_at).getTime()
        : (deployStartedAt ?? Date.now())
    const initialElapsed = Math.floor((Date.now() - triggeredAt) / 1000)
    setElapsedSeconds(Math.max(0, initialElapsed))

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - triggeredAt) / 1000)
      setElapsedSeconds(Math.max(0, elapsed))
    }, 1000)

    return () => clearInterval(interval)
  }, [isDeploying, currentDeployment?.triggered_at, currentDeployment?.status, deployStartedAt])

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
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
                {currentDeployment?.site?.live_url && currentDeployment.status === 'ready' && (
                  <Button variant="outline" onClick={() => window.open(currentDeployment.site.live_url, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Voir le site
                  </Button>
                )}
                <Button onClick={() => triggerDeploy()} disabled={isDeploying || isLoading || isTriggering}>
                  {isTriggering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isDeploying ? 'Déploiement en cours...' : 'Publier le site'}
                </Button>
              </div>
            </div>

            {isDeploying && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Déploiement en cours...</p>
                  <p className="text-sm font-medium tabular-nums text-muted-foreground">{formatElapsed(elapsedSeconds)}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/3 rounded-full bg-primary animate-[slide_1.5s_ease-in-out_infinite]" />
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
