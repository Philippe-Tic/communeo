import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LoadingSpinner, NotFoundBanner } from '../components/common'
import { FormSection } from '../components/forms'
import { PageHeader } from '../components/layout'
import {
  useSchoolMenu,
  useCreateSchoolMenu,
  useUpdateSchoolMenu,
  type SchoolMenu,
} from '../hooks/api/useSchoolMenus'
import { uploadFile } from '../hooks/api/useOfficialDocuments'
import {
  MENU_MODE_OPTIONS,
  MEAL_DAY_OPTIONS,
  MEAL_LABEL_CONFIG,
  ALL_MEAL_LABELS,
  type MenuMode,
  type MealDay,
  type MealLabel,
} from '../lib/constants/school-menu-types'
import { getMonday, formatDateISO } from '../lib/utils/week'
import { toaster } from '../lib/toaster'

interface MealFormData {
  day: MealDay
  starter: string
  main_course: string
  side_dish: string
  dairy: string
  dessert: string
  snack: string
  labels: MealLabel[]
}

interface SchoolMenuFormData {
  week_start: string
  menu_mode: MenuMode
  school_name: string
  meals: MealFormData[]
}

const DEFAULT_MEALS: MealFormData[] = MEAL_DAY_OPTIONS.map(({ value }) => ({
  day: value,
  starter: '',
  main_course: '',
  side_dish: '',
  dairy: '',
  dessert: '',
  snack: '',
  labels: [],
}))

interface SchoolMenuFormProps {
  isEditing?: boolean
  initialData?: SchoolMenu
}

function SchoolMenuForm({ isEditing = false, initialData }: SchoolMenuFormProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null)
  const [menuPdfFile, setMenuPdfFile] = useState<File | null>(null)

  const createMutation = useCreateSchoolMenu()
  const updateMutation = useUpdateSchoolMenu()

  const defaultWeek = searchParams.get('week') || formatDateISO(getMonday(new Date()))

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<SchoolMenuFormData>({
    defaultValues: {
      week_start: initialData?.week_start || defaultWeek,
      menu_mode: initialData?.menu_mode || 'image',
      school_name: initialData?.school_name || '',
      meals: initialData?.meals && initialData.meals.length > 0
        ? MEAL_DAY_OPTIONS.map(({ value: day }) => {
            const existing = initialData.meals!.find(m => m.day === day)
            return {
              day,
              starter: existing?.starter || '',
              main_course: existing?.main_course || '',
              side_dish: existing?.side_dish || '',
              dairy: existing?.dairy || '',
              dessert: existing?.dessert || '',
              snack: existing?.snack || '',
              labels: (existing?.labels as MealLabel[]) || [],
            }
          })
        : DEFAULT_MEALS,
    },
  })

  const { fields } = useFieldArray({ control, name: 'meals' })
  const menuMode = watch('menu_mode')

  // Auto-snap week_start to Monday
  const handleWeekStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value + 'T00:00:00')
    if (!isNaN(date.getTime())) {
      const monday = getMonday(date)
      setValue('week_start', formatDateISO(monday))
    }
  }

  const toggleLabel = (mealIndex: number, label: MealLabel) => {
    const currentLabels = watch(`meals.${mealIndex}.labels`) || []
    if (currentLabels.includes(label)) {
      setValue(`meals.${mealIndex}.labels`, currentLabels.filter((l: MealLabel) => l !== label))
    } else {
      setValue(`meals.${mealIndex}.labels`, [...currentLabels, label])
    }
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:1337'

  const onSubmit = async (data: SchoolMenuFormData) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      let menuImageId: number | undefined
      let menuPdfId: number | undefined

      if (menuImageFile) {
        const uploaded = await uploadFile(menuImageFile)
        menuImageId = uploaded.id
      }

      if (menuPdfFile) {
        const uploaded = await uploadFile(menuPdfFile)
        menuPdfId = uploaded.id
      }

      const submitData: Record<string, any> = {
        week_start: data.week_start,
        menu_mode: data.menu_mode,
        school_name: data.school_name || undefined,
      }

      if (data.menu_mode === 'image') {
        if (menuImageId) submitData.menu_image = menuImageId
        if (menuPdfId) submitData.menu_pdf = menuPdfId
        submitData.meals = []
      } else {
        submitData.meals = data.meals.map(meal => ({
          day: meal.day,
          starter: meal.starter || undefined,
          main_course: meal.main_course,
          side_dish: meal.side_dish || undefined,
          dairy: meal.dairy || undefined,
          dessert: meal.dessert || undefined,
          snack: meal.snack || undefined,
          labels: meal.labels.length > 0 ? meal.labels : undefined,
        }))
        submitData.menu_image = null
        submitData.menu_pdf = null
      }

      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, ...submitData })
        toaster.create({ title: 'Menu mis a jour', type: 'success', duration: 3000 })
      } else {
        await createMutation.mutateAsync(submitData as any)
        toaster.create({ title: 'Menu cree', type: 'success', duration: 3000 })
      }

      navigate('/cantine')
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde.',
        type: 'error',
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEditing ? 'Modifier le menu' : 'Nouveau menu de cantine'}
          subtitle="Configurez le menu de la semaine"
          actions={[
            { label: 'Retour', onClick: () => navigate('/cantine'), variant: 'outline' as const },
          ]}
          breadcrumbs={[
            { label: 'Cantine', href: '/cantine' },
            { label: isEditing ? 'Modifier' : 'Nouveau' },
          ]}
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6">
            {/* Semaine et ecole */}
            <FormSection title="Informations generales">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2">Semaine du *</Label>
                  <Input
                    type="date"
                    {...register('week_start', { required: 'La semaine est requise' })}
                    onChange={handleWeekStartChange}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    La date sera automatiquement ajustee au lundi de la semaine.
                  </p>
                  {errors.week_start && (
                    <p className="mt-1 text-sm text-destructive">{errors.week_start.message}</p>
                  )}
                </div>
                <div>
                  <Label className="mb-2">Nom de l'ecole (optionnel)</Label>
                  <Input
                    placeholder="Ex: Ecole Jean Moulin"
                    maxLength={200}
                    {...register('school_name')}
                  />
                </div>
              </div>
            </FormSection>

            {/* Mode de saisie */}
            <FormSection title="Mode de saisie">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {MENU_MODE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('menu_mode', option.value)}
                    className={`flex flex-col gap-1 rounded-lg border-2 p-4 text-left transition-colors ${
                      menuMode === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className="font-semibold">{option.label}</span>
                    <span className="text-sm text-muted-foreground">{option.description}</span>
                  </button>
                ))}
              </div>
            </FormSection>

            {/* Mode image */}
            {menuMode === 'image' && (
              <FormSection title="Fichiers du menu">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-2">Image du menu</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setMenuImageFile(e.target.files?.[0] || null)}
                    />
                    {isEditing && initialData?.menu_image && !menuImageFile && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">Image actuelle :</p>
                        <img
                          src={`${apiUrl}${initialData.menu_image.url}`}
                          alt="Menu actuel"
                          className="mt-1 max-h-32 rounded border"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="mb-2">PDF du menu (optionnel)</Label>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setMenuPdfFile(e.target.files?.[0] || null)}
                    />
                    {isEditing && initialData?.menu_pdf && !menuPdfFile && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        PDF actuel : {initialData.menu_pdf.name}
                      </p>
                    )}
                  </div>
                </div>
              </FormSection>
            )}

            {/* Mode manuel */}
            {menuMode === 'manual' && (
              <FormSection title="Repas de la semaine">
                <div className="flex flex-col gap-4">
                  {fields.map((field, index) => {
                    const dayLabel = MEAL_DAY_OPTIONS.find(d => d.value === field.day)?.label || field.day
                    const currentLabels = watch(`meals.${index}.labels`) || []

                    return (
                      <div key={field.id} className="rounded-lg border bg-muted/30 p-4">
                        <h3 className="mb-3 font-semibold">{dayLabel}</h3>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                          <div>
                            <Label className="mb-1 text-xs">Entree</Label>
                            <Input
                              placeholder="Entree..."
                              maxLength={200}
                              {...register(`meals.${index}.starter`)}
                            />
                          </div>
                          <div>
                            <Label className="mb-1 text-xs">Plat principal *</Label>
                            <Input
                              placeholder="Plat principal..."
                              maxLength={200}
                              {...register(`meals.${index}.main_course`, { required: 'Requis' })}
                            />
                          </div>
                          <div>
                            <Label className="mb-1 text-xs">Accompagnement</Label>
                            <Input
                              placeholder="Accompagnement..."
                              maxLength={200}
                              {...register(`meals.${index}.side_dish`)}
                            />
                          </div>
                          <div>
                            <Label className="mb-1 text-xs">Fromage</Label>
                            <Input
                              placeholder="Fromage..."
                              maxLength={200}
                              {...register(`meals.${index}.dairy`)}
                            />
                          </div>
                          <div>
                            <Label className="mb-1 text-xs">Dessert</Label>
                            <Input
                              placeholder="Dessert..."
                              maxLength={200}
                              {...register(`meals.${index}.dessert`)}
                            />
                          </div>
                          <div>
                            <Label className="mb-1 text-xs">Gouter</Label>
                            <Input
                              placeholder="Gouter..."
                              maxLength={200}
                              {...register(`meals.${index}.snack`)}
                            />
                          </div>
                        </div>
                        {/* Labels qualite */}
                        <div className="mt-3">
                          <Label className="mb-1 text-xs">Labels qualite</Label>
                          <div className="flex flex-wrap gap-2">
                            {ALL_MEAL_LABELS.map(label => {
                              const config = MEAL_LABEL_CONFIG[label]
                              const isActive = currentLabels.includes(label)
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => toggleLabel(index, label)}
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity ${config.className} ${
                                    isActive ? 'opacity-100' : 'opacity-40'
                                  }`}
                                >
                                  {config.emoji} {config.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </FormSection>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => navigate('/cantine')}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Modifier' : 'Creer'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export function CreateSchoolMenu() {
  return <SchoolMenuForm />
}

export function EditSchoolMenu() {
  const { id } = useParams<{ id: string }>()
  const { data: menu, isLoading, error } = useSchoolMenu(id || '')

  if (isLoading) return <LoadingSpinner message="Chargement du menu..." />
  if (error || !menu) {
    return <NotFoundBanner message="Menu non trouve" />
  }
  return <SchoolMenuForm isEditing={true} initialData={menu} />
}
