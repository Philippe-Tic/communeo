import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  GripVertical,
  Trash2,
  FileText,
  LayoutGrid,
  ChevronDown,
  ArrowUp,
  Plus,
} from 'lucide-react'
import type { NavigationItem, SectionKey } from '../../hooks/api/useSites'
import type { Page } from '../../hooks/api/usePages'
import { getSectionDefinition, createNavigationItem, type SectionDefinition } from '../../lib/navigation'

interface SortableNavigationItemProps {
  item: NavigationItem
  pageTitle?: string
  onUpdate: (id: string, updates: Partial<NavigationItem>) => void
  onRemove: (id: string) => void
  // Child management (only for top-level items)
  onAddChild?: (parentId: string, child: NavigationItem) => void
  onRemoveChild?: (parentId: string, childId: string) => void
  onReorderChildren?: (parentId: string, oldIndex: number, newIndex: number) => void
  onUpdateChild?: (parentId: string, childId: string, updates: Partial<NavigationItem>) => void
  onPromoteChild?: (parentId: string, childId: string) => void
  availableSections?: SectionDefinition[]
  availablePages?: Page[]
  pageTitleMap?: Map<string, string>
  isDraggingTopLevel?: boolean
  // When rendered as a child
  isChild?: boolean
  parentId?: string
}

export const SortableNavigationItem = ({
  item,
  pageTitle,
  onUpdate,
  onRemove,
  onAddChild,
  onRemoveChild,
  onReorderChildren,
  onUpdateChild,
  onPromoteChild,
  availableSections = [],
  availablePages = [],
  pageTitleMap = new Map(),
  isDraggingTopLevel = false,
  isChild = false,
  parentId,
}: SortableNavigationItemProps) => {
  const [expanded, setExpanded] = useState(() => (item.children?.length ?? 0) > 0)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const sectionDef = item.type === 'section' && item.key
    ? getSectionDefinition(item.key)
    : undefined

  const defaultLabel = item.type === 'section'
    ? sectionDef?.defaultLabel || item.key || ''
    : pageTitle || 'Page inconnue'

  const hasChildren = (item.children?.length ?? 0) > 0

  // Collapse while dragging top-level
  const showChildren = !isChild && expanded && !isDraggingTopLevel

  // --- Child item row (simplified, no expand) ---
  if (isChild) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-3 rounded-lg border bg-card p-2.5 ml-8 ${
          isDragging ? 'opacity-50 shadow-lg' : ''
        } ${!item.enabled ? 'opacity-60' : ''}`}
      >
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
          {item.type === 'section' ? (
            <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Input
            value={item.label || ''}
            onChange={(e) => {
              if (onUpdateChild && parentId) {
                onUpdateChild(parentId, item.id, { label: e.target.value || undefined })
              }
            }}
            placeholder={defaultLabel}
            className="h-7 text-sm"
          />
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">
          {item.type === 'section' ? 'Section' : 'Page'}
        </span>

        <Switch
          checked={item.enabled}
          onCheckedChange={(checked) => {
            if (onUpdateChild && parentId) {
              onUpdateChild(parentId, item.id, { enabled: checked })
            }
          }}
        />

        {onPromoteChild && parentId && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onPromoteChild(parentId, item.id)}
            title="Promouvoir au niveau principal"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (onRemoveChild && parentId) {
              onRemoveChild(parentId, item.id)
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  // --- Top-level item ---
  return (
    <div>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
          isDragging ? 'opacity-50 shadow-lg' : ''
        } ${!item.enabled ? 'opacity-60' : ''}`}
      >
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-transform"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Replier' : 'Déplier pour ajouter des sous-éléments'}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          {item.type === 'section' ? (
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Input
            value={item.label || ''}
            onChange={(e) => onUpdate(item.id, { label: e.target.value || undefined })}
            placeholder={defaultLabel}
            className="h-8 text-sm"
          />
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">
          {item.type === 'section' ? 'Section' : 'Page'}
        </span>

        {hasChildren && (
          <span className="shrink-0 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {item.children!.length}
          </span>
        )}

        <Switch
          checked={item.enabled}
          onCheckedChange={(checked) => onUpdate(item.id, { enabled: checked })}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Children zone */}
      {showChildren && (
        <ChildrenZone
          parentId={item.id}
          children={item.children || []}
          onAddChild={onAddChild!}
          onRemoveChild={onRemoveChild!}
          onReorderChildren={onReorderChildren!}
          onUpdateChild={onUpdateChild!}
          onPromoteChild={onPromoteChild!}
          availableSections={availableSections}
          availablePages={availablePages}
          pageTitleMap={pageTitleMap}
        />
      )}
    </div>
  )
}

// --- Separate component for children DnD context ---

interface ChildrenZoneProps {
  parentId: string
  children: NavigationItem[]
  onAddChild: (parentId: string, child: NavigationItem) => void
  onRemoveChild: (parentId: string, childId: string) => void
  onReorderChildren: (parentId: string, oldIndex: number, newIndex: number) => void
  onUpdateChild: (parentId: string, childId: string, updates: Partial<NavigationItem>) => void
  onPromoteChild: (parentId: string, childId: string) => void
  availableSections: SectionDefinition[]
  availablePages: Page[]
  pageTitleMap: Map<string, string>
}

const ChildrenZone = ({
  parentId,
  children,
  onAddChild,
  onRemoveChild,
  onReorderChildren,
  onUpdateChild,
  onPromoteChild,
  availableSections,
  availablePages,
  pageTitleMap,
}: ChildrenZoneProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = children.findIndex((c) => c.id === active.id)
      const newIndex = children.findIndex((c) => c.id === over.id)
      onReorderChildren(parentId, oldIndex, newIndex)
    }
  }

  const addChildSection = (key: SectionKey) => {
    onAddChild(parentId, createNavigationItem({ type: 'section', key }))
  }

  const addChildPage = (page: Page) => {
    onAddChild(parentId, createNavigationItem({ type: 'page', pageDocumentId: page.documentId }))
  }

  return (
    <div className="ml-6 mt-1 mb-1 pl-4 border-l-2 border-muted">
      {children.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleChildDragEnd}
        >
          <SortableContext
            items={children.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1.5">
              {children.map((child) => (
                <SortableNavigationItem
                  key={child.id}
                  item={child}
                  pageTitle={
                    child.type === 'page' && child.pageDocumentId
                      ? pageTitleMap.get(child.pageDocumentId)
                      : undefined
                  }
                  onUpdate={() => {}}
                  onRemove={() => {}}
                  isChild
                  parentId={parentId}
                  onUpdateChild={onUpdateChild}
                  onRemoveChild={onRemoveChild}
                  onPromoteChild={onPromoteChild}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-2 mt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={availableSections.length === 0}
            >
              <Plus className="mr-1 h-3 w-3" />
              <LayoutGrid className="mr-1 h-3 w-3" />
              Section
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableSections.map((section) => (
              <DropdownMenuItem
                key={section.key}
                onClick={() => addChildSection(section.key)}
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
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={availablePages.length === 0}
            >
              <Plus className="mr-1 h-3 w-3" />
              <FileText className="mr-1 h-3 w-3" />
              Page
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availablePages.map((page) => (
              <DropdownMenuItem
                key={page.documentId}
                onClick={() => addChildPage(page)}
              >
                {page.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
