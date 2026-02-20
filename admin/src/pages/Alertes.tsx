import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { PageHeader } from '../components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAlertes,
  useDeleteAlerte,
  useUpdateAlerte,
  SEVERITY_CONFIG,
  type Alerte,
} from '../hooks/api/useAlertes'
import { toaster } from '../lib/toaster'
import { AlertTriangle, Info, Megaphone, Pencil, Power, PowerOff, Trash2 } from 'lucide-react'

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: Megaphone,
}

export const Alertes = () => {
  const navigate = useNavigate()
  const [alerteToDelete, setAlerteToDelete] = useState<Alerte | null>(null)

  const { data: alertesData, isLoading } = useAlertes()
  const deleteMutation = useDeleteAlerte()
  const updateMutation = useUpdateAlerte()

  const alertes = alertesData?.data || []

  const handleDelete = async () => {
    if (!alerteToDelete) return
    try {
      await deleteMutation.mutateAsync(alerteToDelete.documentId)
      toaster.create({
        title: 'Alerte supprimée',
        type: 'success',
        duration: 3000,
      })
      setAlerteToDelete(null)
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleToggleActive = async (alerte: Alerte) => {
    try {
      await updateMutation.mutateAsync({
        id: alerte.documentId,
        active: !alerte.active,
      })
      toaster.create({
        title: alerte.active ? 'Alerte désactivée' : 'Alerte activée',
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const headerActions = [
    {
      label: 'Nouvelle alerte',
      onClick: () => navigate('/alertes/new'),
      colorScheme: 'blue',
    },
  ]

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Alertes"
          subtitle="Gérez les bandeaux d'alerte affichés sur votre site"
          actions={headerActions}
        />

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border bg-card p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : alertes.length === 0 ? (
          <div className="py-12 text-center">
            <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-foreground">Aucune alerte</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Créez des alertes pour afficher des bandeaux d'urgence sur votre site (météo, inondations, etc.)
            </p>
            <Button onClick={() => navigate('/alertes/new')}>
              Créer une alerte
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alertes.map((alerte) => {
              const SeverityIcon = SEVERITY_ICONS[alerte.severity]
              const severityConfig = SEVERITY_CONFIG[alerte.severity]
              const isExpired = alerte.display_until && new Date(alerte.display_until) < new Date()

              return (
                <div
                  key={alerte.documentId}
                  className={`flex items-center gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md ${!alerte.active ? 'opacity-60' : ''}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${severityConfig.className}`}>
                    <SeverityIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{alerte.title}</p>
                      <Badge className={severityConfig.className}>{severityConfig.label}</Badge>
                      {alerte.active ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                      {isExpired && (
                        <Badge variant="outline" className="text-muted-foreground">Expiré</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{alerte.message}</p>
                    {(alerte.display_from || alerte.display_until) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {alerte.display_from && `Du ${new Date(alerte.display_from).toLocaleDateString('fr-FR')}`}
                        {alerte.display_until && ` au ${new Date(alerte.display_until).toLocaleDateString('fr-FR')}`}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleActive(alerte)}
                      title={alerte.active ? 'Désactiver' : 'Activer'}
                    >
                      {alerte.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/alertes/${alerte.documentId}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setAlerteToDelete(alerte)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <ConfirmDialog
          isOpen={!!alerteToDelete}
          onClose={() => setAlerteToDelete(null)}
          onConfirm={handleDelete}
          title="Supprimer l'alerte"
          message={`Êtes-vous sûr de vouloir supprimer l'alerte "${alerteToDelete?.title}" ?`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}
