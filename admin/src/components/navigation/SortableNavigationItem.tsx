import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  type SensorDescriptor,
  type SensorOptions,
} from '@dnd-kit/core'
import {
  SortableContext,
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
import { GripVertical, Trash2, FileText, Link, Folder, ChevronDown, ChevronRight, Plus, MoreHorizontal, ArrowUpFromLine } from 'lucide-react'
import { useState } from 'react'
import type { NavigationItem, LinkKey } from '../../hooks/api/useSites'
import type { Page } from '../../hooks/api/usePages'
import { getLinkDefinition, type LinkDefinition } from '../../lib/navigation'

interface SortableNavigationItemProps {
  item: NavigationItem
  pageTitle?: string
  onUpdate: (id: string, updates: Partial<NavigationItem>) => void
  onRemove: (id: string) => void
  sections: NavigationItem[]
  onMoveToSection: (itemId: string, sectionId: string) => void
  // Section-specific
  onChildDragEnd?: (event: DragEndEvent) => void
  onChildUpdate?: (childId: string, updates: Partial<NavigationItem>) => void
  onChildRemove?: (childId: string) => void
  onMoveToTopLevel?: (childId: string) => void
  pageTitleMap?: Map<string, string>
  availablePages?: Page[]
  availableLinks?: LinkDefinition[]
  onAddPageToSection?: (page: Page) => void
  onAddLinkToSection?: (key: LinkKey) => void
  sensors?: SensorDescriptor<SensorOptions>[]
}

export const SortableNavigationItem = ({
  item,
  pageTitle,
  onUpdate,
  onRemove,
  sections,
  onMoveToSection,
  onChildDragEnd,
  onChildUpdate,
  onChildRemove,
  onMoveToTopLevel,
  pageTitleMap,
  availablePages,
  availableLinks,
  onAddPageToSection,
  onAddLinkToSection,
  sensors,
}: SortableNavigationItemProps) => {
  const [expanded, setExpanded] = useState(true)

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

  const linkDef = item.type === 'link' && item.linkKey
    ? getLinkDefinition(item.linkKey)
    : undefined

  const defaultLabel = item.type === 'link'
    ? linkDef?.defaultLabel || item.linkKey || ''
    : item.type === 'page'
      ? pageTitle || 'Page inconnue'
      : item.label || 'Section'

  const typeLabel = item.type === 'link' ? 'Lien' : item.type === 'page' ? 'Page' : 'Section'
  const TypeIcon = item.type === 'link' ? Link : item.type === 'page' ? FileText : Folder

  const isSection = item.type === 'section'
  const children = item.children || []

  // Other sections to move item into (exclude current item if it's a section)
  const otherSections = sections.filter((s) => s.id !== item.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'opacity-50' : ''}
    >
      <div
        className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${
          !item.enabled ? 'opacity-60' : ''
        } ${isSection ? 'border-primary/20 bg-primary/[0.02]' : ''}`}
      >
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {isSection && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}

        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <Input
            value={item.label || ''}
            onChange={(e) => onUpdate(item.id, { label: e.target.value || undefined })}
            placeholder={defaultLabel}
            className="h-8 text-sm"
          />
        </div>

        <span className="shrink-0 text-xs text-muted-foreground">{typeLabel}</span>

        <Switch
          checked={item.enabled}
          onCheckedChange={(checked) => onUpdate(item.id, { enabled: checked })}
        />

        {/* Context menu: move to section / more actions */}
        {!isSection && otherSections.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {otherSections.map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => onMoveToSection(item.id, s.id)}>
                  Déplacer dans « {s.label} »
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

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

      {/* Section children */}
      {isSection && expanded && (
        <div className="ml-8 mt-1 flex flex-col gap-1 border-l-2 border-primary/10 pl-3">
          {children.length > 0 && onChildDragEnd && sensors ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onChildDragEnd}
            >
              <SortableContext
                items={children.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {children.map((child) => (
                  <SectionChildItem
                    key={child.id}
                    item={child}
                    pageTitle={
                      child.type === 'page' && child.pageDocumentId
                        ? pageTitleMap?.get(child.pageDocumentId)
                        : undefined
                    }
                    onUpdate={onChildUpdate!}
                    onRemove={onChildRemove!}
                    onMoveToTopLevel={onMoveToTopLevel!}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : children.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 pl-2">
              Section vide — ajoutez des pages ou des liens ci-dessous.
            </p>
          ) : null}

          {/* Add to section buttons */}
          <div className="flex items-center gap-2 mt-1">
            {onAddPageToSection && availablePages && availablePages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    <FileText className="mr-1 h-3 w-3" />
                    Page
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {availablePages.map((page) => (
                    <DropdownMenuItem key={page.documentId} onClick={() => onAddPageToSection(page)}>
                      {page.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {onAddLinkToSection && availableLinks && availableLinks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs">
                    <Plus className="mr-1 h-3 w-3" />
                    <Link className="mr-1 h-3 w-3" />
                    Lien
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {availableLinks.map((link) => (
                    <DropdownMenuItem key={link.key} onClick={() => onAddLinkToSection(link.key)}>
                      {link.defaultLabel}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Child item inside a section ---
interface SectionChildItemProps {
  item: NavigationItem
  pageTitle?: string
  onUpdate: (childId: string, updates: Partial<NavigationItem>) => void
  onRemove: (childId: string) => void
  onMoveToTopLevel: (childId: string) => void
}

const SectionChildItem = ({
  item,
  pageTitle,
  onUpdate,
  onRemove,
  onMoveToTopLevel,
}: SectionChildItemProps) => {
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

  const linkDef = item.type === 'link' && item.linkKey
    ? getLinkDefinition(item.linkKey)
    : undefined

  const defaultLabel = item.type === 'link'
    ? linkDef?.defaultLabel || item.linkKey || ''
    : pageTitle || 'Page inconnue'

  const typeLabel = item.type === 'link' ? 'Lien' : 'Page'
  const TypeIcon = item.type === 'link' ? Link : FileText

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border bg-card p-2 ${
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

      <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <Input
          value={item.label || ''}
          onChange={(e) => onUpdate(item.id, { label: e.target.value || undefined })}
          placeholder={defaultLabel}
          className="h-7 text-xs"
        />
      </div>

      <span className="shrink-0 text-[10px] text-muted-foreground">{typeLabel}</span>

      <Switch
        checked={item.enabled}
        onCheckedChange={(checked) => onUpdate(item.id, { enabled: checked })}
        className="scale-75"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onMoveToTopLevel(item.id)}
        title="Remonter au niveau principal"
      >
        <ArrowUpFromLine className="h-3.5 w-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(item.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
