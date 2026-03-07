import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog, EmptyState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  useWasteSchedules,
  useDeleteWasteSchedule,
  useUpdateWasteSchedule,
  WASTE_TYPE_CONFIG,
  type WasteSchedule,
} from '../hooks/api/useWasteSchedules'
import { COLLECTION_DAY_OPTIONS, FREQUENCY_OPTIONS } from '../lib/constants/waste-types'
import { toaster } from '../lib/toaster'
import { Pencil, Power, PowerOff, Recycle, Trash2 } from 'lucide-react'

export const WasteSchedules = () => {
  const navigate = useNavigate()
  const [scheduleToDelete, setScheduleToDelete] = useState<WasteSchedule | null>(null)

  const { data: schedulesData, isLoading } = useWasteSchedules()
  const deleteMutation = useDeleteWasteSchedule()
  const updateMutation = useUpdateWasteSchedule()

  const schedules = schedulesData?.data || []

  const handleDelete = async () => {
    if (!scheduleToDelete) return
    try {
      await deleteMutation.mutateAsync(scheduleToDelete.documentId)
      toaster.create({
        title: 'Planning supprime',
        type: 'success',
        duration: 3000,
      })
      setScheduleToDelete(null)
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleToggleActive = async (schedule: WasteSchedule) => {
    try {
      await updateMutation.mutateAsync({
        id: schedule.documentId,
        active: !schedule.active,
      })
      toaster.create({
        title: schedule.active ? 'Planning desactive' : 'Planning active',
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

  const getDayLabel = (day: string) => COLLECTION_DAY_OPTIONS.find(o => o.value === day)?.label || day
  const getFrequencyLabel = (freq: string) => FREQUENCY_OPTIONS.find(o => o.value === freq)?.label || freq

  const headerActions = [
    {
      label: 'Nouveau planning',
      onClick: () => navigate('/collecte-dechets/new'),
      colorScheme: 'blue',
    },
  ]

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Collecte des dechets"
          subtitle="Gerez les plannings de collecte des dechets de votre commune"
          actions={headerActions}
        />

        {isLoading ? (
          <LoadingSpinner message="Chargement des plannings..." />
        ) : schedules.length === 0 ? (
          <EmptyState
            title="Aucun planning"
            description="Configurez les jours et frequences de collecte des dechets pour votre commune."
            icon={<Recycle className="h-7 w-7" />}
            actionLabel="Creer un planning"
            onAction={() => navigate('/collecte-dechets/new')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {schedules.map((schedule) => {
              const typeConfig = WASTE_TYPE_CONFIG[schedule.waste_type]

              return (
                <div
                  key={schedule.documentId}
                  className={`flex cursor-pointer items-center gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md ${!schedule.active ? 'opacity-60' : ''}`}
                  onClick={() => navigate(`/collecte-dechets/${schedule.documentId}/edit`)}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${typeConfig.className}`}>
                    <Recycle className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold">{typeConfig.label}</p>
                      <Badge className={typeConfig.className}>{getDayLabel(schedule.collection_day)}</Badge>
                      <Badge variant="outline">{getFrequencyLabel(schedule.frequency)}</Badge>
                      {schedule.active ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {schedule.zone && (
                        <p className="text-sm text-muted-foreground">Zone : {schedule.zone}</p>
                      )}
                      {schedule.notes && (
                        <p className="truncate text-sm text-muted-foreground">- {schedule.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(schedule) }}
                      title={schedule.active ? 'Desactiver' : 'Activer'}
                    >
                      {schedule.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); navigate(`/collecte-dechets/${schedule.documentId}/edit`) }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setScheduleToDelete(schedule) }}
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
          isOpen={!!scheduleToDelete}
          onClose={() => setScheduleToDelete(null)}
          onConfirm={handleDelete}
          title="Supprimer le planning"
          message={`Etes-vous sur de vouloir supprimer ce planning de collecte ?`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}
