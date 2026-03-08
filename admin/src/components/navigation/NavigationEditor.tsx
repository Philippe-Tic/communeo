import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
import {
  PREDEFINED_SECTIONS,
  getDefaultNavigationConfig,
  getAllUsedSectionKeys,
  getAllUsedPageDocIds,
  removeItemById,
  createNavigationItem,
} from '../../lib/navigation'
import { SortableNavigationItem } from './SortableNavigationItem'

interface NavigationEditorProps {
  items: NavigationItem[]
  onChange: (items: NavigationItem[]) => void
  pages: Page[]
}

export const NavigationEditor = ({ items, onChange, pages }: NavigationEditorProps) => {
  const [isDraggingTopLevel, setIsDraggingTopLevel] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (_event: DragStartEvent) => {
    setIsDraggingTopLevel(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingTopLevel(false)
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
    onChange(removeItemById(items, id))
  }

  const addSection = (key: SectionKey) => {
    onChange([...items, createNavigationItem({ type: 'section', key })])
  }

  const addPage = (page: Page) => {
    onChange([...items, createNavigationItem({ type: 'page', pageDocumentId: page.documentId })])
  }

  const handleReset = () => {
    onChange(getDefaultNavigationConfig())
  }

  // --- Child management callbacks ---

  const handleAddChild = (parentId: string, child: NavigationItem) => {
    onChange(items.map((item) => {
      if (item.id !== parentId) return item
      return { ...item, children: [...(item.children || []), child] }
    }))
  }

  const handleRemoveChild = (parentId: string, childId: string) => {
    onChange(items.map((item) => {
      if (item.id !== parentId || !item.children) return item
      const filtered = item.children.filter(c => c.id !== childId)
      return { ...item, children: filtered.length > 0 ? filtered : undefined }
    }))
  }

  const handleReorderChildren = (parentId: string, oldIndex: number, newIndex: number) => {
    onChange(items.map((item) => {
      if (item.id !== parentId || !item.children) return item
      return { ...item, children: arrayMove(item.children, oldIndex, newIndex) }
    }))
  }

  const handleUpdateChild = (parentId: string, childId: string, updates: Partial<NavigationItem>) => {
    onChange(items.map((item) => {
      if (item.id !== parentId || !item.children) return item
      return {
        ...item,
        children: item.children.map(c => c.id === childId ? { ...c, ...updates } : c),
      }
    }))
  }

  const handlePromoteChild = (parentId: string, childId: string) => {
    let promotedChild: NavigationItem | undefined
    const updated = items.map((item) => {
      if (item.id !== parentId || !item.children) return item
      promotedChild = item.children.find(c => c.id === childId)
      const filtered = item.children.filter(c => c.id !== childId)
      return { ...item, children: filtered.length > 0 ? filtered : undefined }
    })
    if (promotedChild) {
      // Insert right after the parent
      const parentIndex = updated.findIndex(i => i.id === parentId)
      const result = [...updated]
      result.splice(parentIndex + 1, 0, promotedChild)
      onChange(result)
    }
  }

  // Items used across all levels
  const usedSectionKeys = getAllUsedSectionKeys(items)
  const availableSections = PREDEFINED_SECTIONS.filter(
    (s) => !usedSectionKeys.has(s.key)
  )

  const usedPageDocIds = getAllUsedPageDocIds(items)
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
          Glissez-déposez pour réordonner. Dépliez un élément pour y ajouter des sous-éléments (1 niveau).
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
          onDragStart={handleDragStart}
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
                  onAddChild={handleAddChild}
                  onRemoveChild={handleRemoveChild}
                  onReorderChildren={handleReorderChildren}
                  onUpdateChild={handleUpdateChild}
                  onPromoteChild={handlePromoteChild}
                  availableSections={availableSections}
                  availablePages={availablePages}
                  pageTitleMap={pageTitleMap}
                  isDraggingTopLevel={isDraggingTopLevel}
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
