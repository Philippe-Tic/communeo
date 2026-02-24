import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutGrid, FileText, Plus, RotateCcw } from 'lucide-react'
import type { NavigationItem, SectionKey } from '../../hooks/api/useSites'
import type { Page } from '../../hooks/api/usePages'
import { PREDEFINED_SECTIONS, getDefaultNavigationConfig } from '../../lib/navigation'
import { SortableNavigationItem } from './SortableNavigationItem'

interface NavigationEditorProps {
  items: NavigationItem[]
  onChange: (items: NavigationItem[]) => void
  pages: Page[]
}

export const NavigationEditor = ({ items, onChange, pages }: NavigationEditorProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  const handleUpdate = (id: string, updates: Partial<NavigationItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  const addSection = (key: SectionKey) => {
    const newItem: NavigationItem = {
      id: crypto.randomUUID(),
      type: 'section',
      key,
      enabled: true,
    }
    onChange([...items, newItem])
  }

  const addPage = (page: Page) => {
    const newItem: NavigationItem = {
      id: crypto.randomUUID(),
      type: 'page',
      pageDocumentId: page.documentId,
      enabled: true,
    }
    onChange([...items, newItem])
  }

  const handleReset = () => {
    onChange(getDefaultNavigationConfig())
  }

  // Sections not yet in the list
  const usedSectionKeys = new Set(
    items.filter((i) => i.type === 'section' && i.key).map((i) => i.key)
  )
  const availableSections = PREDEFINED_SECTIONS.filter(
    (s) => !usedSectionKeys.has(s.key)
  )

  // Pages not yet in the list
  const usedPageDocIds = new Set(
    items.filter((i) => i.type === 'page' && i.pageDocumentId).map((i) => i.pageDocumentId)
  )
  const availablePages = pages.filter(
    (p) => !usedPageDocIds.has(p.documentId)
  )

  // Map pageDocumentId to page title for display
  const pageTitleMap = new Map(pages.map((p) => [p.documentId, p.title]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Configurez l'ordre et la visibilité des éléments du menu principal.
          Glissez-déposez pour réordonner. Les éléments désactivés ne seront pas affichés sur le site.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Aucun élément de navigation configuré. Ajoutez des sections ou des pages, ou réinitialisez la configuration par défaut.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Initialiser avec les sections par défaut
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <SortableNavigationItem
                  key={item.id}
                  item={item}
                  pageTitle={
                    item.type === 'page' && item.pageDocumentId
                      ? pageTitleMap.get(item.pageDocumentId)
                      : undefined
                  }
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={availableSections.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              <LayoutGrid className="mr-1 h-3.5 w-3.5" />
              Ajouter une section
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableSections.map((section) => (
              <DropdownMenuItem
                key={section.key}
                onClick={() => addSection(section.key)}
              >
                {section.defaultLabel}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={availablePages.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              <FileText className="mr-1 h-3.5 w-3.5" />
              Ajouter une page
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availablePages.map((page) => (
              <DropdownMenuItem
                key={page.documentId}
                onClick={() => addPage(page)}
              >
                {page.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {items.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="ml-auto text-muted-foreground"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>
    </div>
  )
}
