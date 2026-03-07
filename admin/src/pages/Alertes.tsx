import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog, EmptyState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  useAlertes,
  useDeleteAlerte,
  useUpdateAlerte,
  SEVERITY_CONFIG,
  type Alerte,
  type AlerteType,
} from '../hooks/api/useAlertes'
import { ALERTE_TYPE_CONFIG, ALERTE_TYPE_OPTIONS } from '../lib/constants/alerte-types'
import { formatDate } from '@/lib/format'
import { toaster } from '../lib/toaster'
import { AlertTriangle, Info, MapPin, Megaphone, Pencil, Power, PowerOff, Trash2 } from 'lucide-react'

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: Megaphone,
}

export const Alertes = () => {
  const navigate = useNavigate()
  const [alerteToDelete, setAlerteToDelete] = useState<Alerte | null>(null)
  const [selectedType, setSelectedType] = useState<AlerteType | undefined>(undefined)

  const { data: alertesData, isLoading } = useAlertes({ alert_type: selectedType })
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

        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedType === undefined ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType(undefined)}
          >
            Tous
          </Button>
          {ALERTE_TYPE_OPTIONS.map(({ value, label }) => {
            const config = ALERTE_TYPE_CONFIG[value as AlerteType]
            return (
              <Button
                key={value}
                variant={selectedType === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(selectedType === value ? undefined : value as AlerteType)}
              >
                {config.emoji} {label}
              </Button>
            )
          })}
        </div>

        {isLoading ? (
          <LoadingSpinner message="Chargement des alertes..." />
        ) : alertes.length === 0 ? (
          <EmptyState
            title="Aucune alerte"
            description="Créez des alertes pour afficher des bandeaux d'urgence sur votre site (météo, inondations, etc.)"
            icon={<Megaphone className="h-7 w-7" />}
            actionLabel="Créer une alerte"
            onAction={() => navigate('/alertes/new')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {alertes.map((alerte) => {
              const SeverityIcon = SEVERITY_ICONS[alerte.severity]
              const severityConfig = SEVERITY_CONFIG[alerte.severity]
              const isExpired = alerte.display_until && new Date(alerte.display_until) < new Date()

              return (
                <div
                  key={alerte.documentId}
                  className={`flex cursor-pointer items-center gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md ${!alerte.active ? 'opacity-60' : ''}`}
                  onClick={() => navigate(`/alertes/${alerte.documentId}/edit`)}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${severityConfig.className}`}>
                    <SeverityIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{alerte.title}</p>
                      {alerte.alert_type && (
                        <Badge className={ALERTE_TYPE_CONFIG[alerte.alert_type].className}>
                          {ALERTE_TYPE_CONFIG[alerte.alert_type].emoji} {ALERTE_TYPE_CONFIG[alerte.alert_type].label}
                        </Badge>
                      )}
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
                    {alerte.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {alerte.location}
                      </p>
                    )}
                    {(alerte.display_from || alerte.display_until) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {alerte.display_from && `Du ${formatDate(alerte.display_from)}`}
                        {alerte.display_until && ` au ${formatDate(alerte.display_until)}`}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(alerte) }}
                      title={alerte.active ? 'Désactiver' : 'Activer'}
                    >
                      {alerte.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); navigate(`/alertes/${alerte.documentId}/edit`) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setAlerteToDelete(alerte) }}
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
