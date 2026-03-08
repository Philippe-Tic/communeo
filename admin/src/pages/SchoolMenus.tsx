import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog, EmptyState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  useSchoolMenus,
  useDeleteSchoolMenu,
  type SchoolMenu,
} from '../hooks/api/useSchoolMenus'
import { MEAL_LABEL_CONFIG, MEAL_DAY_OPTIONS } from '../lib/constants/school-menu-types'
import type { MealLabel } from '../lib/constants/school-menu-types'
import { getMonday, formatWeekRange, formatDateISO } from '../lib/utils/week'
import { toaster } from '../lib/toaster'
import { ChevronLeft, ChevronRight, Pencil, Trash2, UtensilsCrossed, Image, List } from 'lucide-react'

export const SchoolMenus = () => {
  const navigate = useNavigate()
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()))
  const [menuToDelete, setMenuToDelete] = useState<SchoolMenu | null>(null)

  const { data: menusData, isLoading } = useSchoolMenus({ week_start: formatDateISO(currentWeekStart) })
  const deleteMutation = useDeleteSchoolMenu()

  const menus = menusData?.data || []
  const currentMenu = menus.length > 0 ? menus[0] : null

  const goToPrevWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() - 7)
      return d
    })
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + 7)
      return d
    })
  }

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()))
  }

  const handleDelete = async () => {
    if (!menuToDelete) return
    try {
      await deleteMutation.mutateAsync(menuToDelete.documentId)
      toaster.create({
        title: 'Menu supprime',
        type: 'success',
        duration: 3000,
      })
      setMenuToDelete(null)
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const handleCreate = () => {
    if (currentMenu) {
      navigate(`/cantine/${currentMenu.documentId}/edit`)
    } else {
      navigate(`/cantine/new?week=${formatDateISO(currentWeekStart)}`)
    }
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:1337'

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Cantine scolaire"
          subtitle="Gerez les menus de cantine de votre commune"
          actions={[
            {
              label: currentMenu ? 'Modifier le menu' : 'Creer le menu',
              onClick: handleCreate,
              colorScheme: 'blue',
            },
          ]}
        />

        {/* Navigation par semaine */}
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{formatWeekRange(currentWeekStart)}</h2>
            <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
              Aujourd'hui
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Chargement du menu..." />
        ) : !currentMenu ? (
          <EmptyState
            title="Aucun menu cette semaine"
            description="Aucun menu de cantine n'a ete cree pour cette semaine."
            icon={<UtensilsCrossed className="h-7 w-7" />}
            actionLabel="Creer le menu de la semaine"
            onAction={handleCreate}
          />
        ) : (
          <div className="rounded-lg border bg-card p-6">
            {/* Header du menu */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {currentMenu.menu_mode === 'image' ? (
                    <Image className="h-5 w-5" />
                  ) : (
                    <List className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">
                    Menu {currentMenu.menu_mode === 'image' ? '(image)' : '(saisie manuelle)'}
                  </p>
                  {currentMenu.school_name && (
                    <p className="text-sm text-muted-foreground">{currentMenu.school_name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate(`/cantine/${currentMenu.documentId}/edit`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setMenuToDelete(currentMenu)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Contenu selon le mode */}
            {currentMenu.menu_mode === 'image' ? (
              <div className="flex flex-col gap-4">
                {currentMenu.menu_image && (
                  <div className="overflow-hidden rounded-lg border">
                    <img
                      src={`${apiUrl}${currentMenu.menu_image.url}`}
                      alt="Menu de la semaine"
                      className="w-full"
                    />
                  </div>
                )}
                {currentMenu.menu_pdf && (
                  <a
                    href={`${apiUrl}${currentMenu.menu_pdf.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    Telecharger le PDF
                  </a>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Jour</th>
                      <th className="px-3 py-2 text-left font-medium">Entree</th>
                      <th className="px-3 py-2 text-left font-medium">Plat</th>
                      <th className="px-3 py-2 text-left font-medium">Accomp.</th>
                      <th className="px-3 py-2 text-left font-medium">Fromage</th>
                      <th className="px-3 py-2 text-left font-medium">Dessert</th>
                      <th className="px-3 py-2 text-left font-medium">Gouter</th>
                      <th className="px-3 py-2 text-left font-medium">Labels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEAL_DAY_OPTIONS.map(({ value: day, label: dayLabel }) => {
                      const meal = currentMenu.meals?.find(m => m.day === day)
                      if (!meal) return null
                      return (
                        <tr key={day} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{dayLabel}</td>
                          <td className="px-3 py-2">{meal.starter || '-'}</td>
                          <td className="px-3 py-2 font-medium">{meal.main_course}</td>
                          <td className="px-3 py-2">{meal.side_dish || '-'}</td>
                          <td className="px-3 py-2">{meal.dairy || '-'}</td>
                          <td className="px-3 py-2">{meal.dessert || '-'}</td>
                          <td className="px-3 py-2">{meal.snack || '-'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {(meal.labels || []).map((label: MealLabel) => {
                                const config = MEAL_LABEL_CONFIG[label]
                                if (!config) return null
                                return (
                                  <Badge key={label} className={config.className}>
                                    {config.emoji} {config.label}
                                  </Badge>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <ConfirmDialog
          isOpen={!!menuToDelete}
          onClose={() => setMenuToDelete(null)}
          onConfirm={handleDelete}
          title="Supprimer le menu"
          message="Etes-vous sur de vouloir supprimer ce menu de cantine ?"
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}
