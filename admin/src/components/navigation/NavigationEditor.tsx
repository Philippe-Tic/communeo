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
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link, FileText, Plus, RotateCcw, FolderPlus } from 'lucide-react'
import { useState } from 'react'
import type { NavigationItem, LinkKey } from '../../hooks/api/useSites'
import type { Page } from '../../hooks/api/usePages'
import { PREDEFINED_LINKS, getDefaultNavigationConfig } from '../../lib/navigation'
import { SortableNavigationItem } from './SortableNavigationItem'

interface NavigationEditorProps {
  items: NavigationItem[]
  onChange: (items: NavigationItem[]) => void
  pages: Page[]
}

export const NavigationEditor = ({ items, onChange, pages }: NavigationEditorProps) => {
  const [newSectionLabel, setNewSectionLabel] = useState('')
  const [showSectionInput, setShowSectionInput] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // --- Top-level drag-and-drop ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id)
      const newIndex = items.findIndex((i) => i.id === over.id)
      onChange(arrayMove(items, oldIndex, newIndex))
    }
  }

  // --- Children drag-and-drop within a section ---
  const handleChildDragEnd = (sectionId: string) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onChange(items.map((item) => {
      if (item.id !== sectionId || !item.children) return item
      const oldIndex = item.children.findIndex((c) => c.id === active.id)
      const newIndex = item.children.findIndex((c) => c.id === over.id)
      return { ...item, children: arrayMove(item.children, oldIndex, newIndex) }
    }))
  }

  // --- Update helpers ---
  const handleUpdate = (id: string, updates: Partial<NavigationItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }

  const handleChildUpdate = (sectionId: string, childId: string, updates: Partial<NavigationItem>) => {
    onChange(items.map((item) => {
      if (item.id !== sectionId || !item.children) return item
      return {
        ...item,
        children: item.children.map((c) => (c.id === childId ? { ...c, ...updates } : c)),
      }
    }))
  }

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id))
  }

  const handleChildRemove = (sectionId: string, childId: string) => {
    onChange(items.map((item) => {
      if (item.id !== sectionId || !item.children) return item
      return { ...item, children: item.children.filter((c) => c.id !== childId) }
    }))
  }

  // --- Add top-level items ---
  const addLink = (key: LinkKey) => {
    const newItem: NavigationItem = {
      id: crypto.randomUUID(),
      type: 'link',
      linkKey: key,
      enabled: true,
    }
    onChange([...items, newItem])
  }

  const addPage = (page: Page, targetSectionId?: string) => {
    const newItem: NavigationItem = {
      id: crypto.randomUUID(),
      type: 'page',
      pageDocumentId: page.documentId,
      enabled: true,
    }
    if (targetSectionId) {
      onChange(items.map((item) => {
        if (item.id !== targetSectionId) return item
        return { ...item, children: [...(item.children || []), newItem] }
      }))
    } else {
      onChange([...items, newItem])
    }
  }

  const addLinkToSection = (key: LinkKey, sectionId: string) => {
    const newItem: NavigationItem = {
      id: crypto.randomUUID(),
      type: 'link',
      linkKey: key,
      enabled: true,
    }
    onChange(items.map((item) => {
      if (item.id !== sectionId) return item
      return { ...item, children: [...(item.children || []), newItem] }
    }))
  }

  const addSection = () => {
    if (!newSectionLabel.trim()) return
    const newItem: NavigationItem = {
      id: crypto.randomUUID(),
      type: 'section',
      label: newSectionLabel.trim(),
      enabled: true,
      children: [],
    }
    onChange([...items, newItem])
    setNewSectionLabel('')
    setShowSectionInput(false)
  }

  const handleReset = () => {
    onChange(getDefaultNavigationConfig())
  }

  // --- Move between levels ---
  const moveToSection = (itemId: string, targetSectionId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item || item.type === 'section') return
    onChange(
      items
        .filter((i) => i.id !== itemId)
        .map((i) => {
          if (i.id !== targetSectionId) return i
          return { ...i, children: [...(i.children || []), item] }
        })
    )
  }

  const moveToTopLevel = (sectionId: string, childId: string) => {
    let movedItem: NavigationItem | undefined
    const newItems = items.map((item) => {
      if (item.id !== sectionId || !item.children) return item
      movedItem = item.children.find((c) => c.id === childId)
      return { ...item, children: item.children.filter((c) => c.id !== childId) }
    })
    if (movedItem) {
      onChange([...newItems, movedItem])
    }
  }

  // --- Computed: available links/pages ---
  const allUsedLinkKeys = new Set<LinkKey>()
  const allUsedPageDocIds = new Set<string>()

  for (const item of items) {
    if (item.type === 'link' && item.linkKey) allUsedLinkKeys.add(item.linkKey)
    if (item.type === 'page' && item.pageDocumentId) allUsedPageDocIds.add(item.pageDocumentId)
    if (item.children) {
      for (const child of item.children) {
        if (child.type === 'link' && child.linkKey) allUsedLinkKeys.add(child.linkKey)
        if (child.type === 'page' && child.pageDocumentId) allUsedPageDocIds.add(child.pageDocumentId)
      }
    }
  }

  const availableLinks = PREDEFINED_LINKS.filter((l) => !allUsedLinkKeys.has(l.key))
  const availablePages = pages.filter((p) => !allUsedPageDocIds.has(p.documentId))

  // Sections (for move-to menu)
  const sections = items.filter((i) => i.type === 'section')

  // Map pageDocumentId to page title for display
  const pageTitleMap = new Map(pages.map((p) => [p.documentId, p.title]))

  // Validation: sections with empty children
  const emptySections = items.filter((i) => i.type === 'section' && (!i.children || i.children.length === 0))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Configurez l'ordre et la visibilité des éléments du menu principal.
          Les sections regroupent des éléments dans un sous-menu. Glissez-déposez pour réordonner.
        </p>
      </div>

      {emptySections.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">
            {emptySections.length === 1
              ? `La section "${emptySections[0].label}" est vide. Ajoutez-y des éléments ou supprimez-la.`
              : `${emptySections.length} sections sont vides. Ajoutez-y des éléments ou supprimez-les.`}
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Aucun élément de navigation configuré. Ajoutez des liens, pages ou sections, ou réinitialisez la configuration par défaut.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Initialiser avec les liens par défaut
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
                  sections={sections}
                  onMoveToSection={moveToSection}
                  // Section-specific props
                  onChildDragEnd={item.type === 'section' ? handleChildDragEnd(item.id) : undefined}
                  onChildUpdate={item.type === 'section'
                    ? (childId, updates) => handleChildUpdate(item.id, childId, updates)
                    : undefined}
                  onChildRemove={item.type === 'section'
                    ? (childId) => handleChildRemove(item.id, childId)
                    : undefined}
                  onMoveToTopLevel={item.type === 'section'
                    ? (childId) => moveToTopLevel(item.id, childId)
                    : undefined}
                  pageTitleMap={pageTitleMap}
                  availablePages={availablePages}
                  availableLinks={availableLinks}
                  onAddPageToSection={item.type === 'section'
                    ? (page) => addPage(page, item.id)
                    : undefined}
                  onAddLinkToSection={item.type === 'section'
                    ? (key) => addLinkToSection(key, item.id)
                    : undefined}
                  sensors={sensors}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {/* Add link button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={availableLinks.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              <Link className="mr-1 h-3.5 w-3.5" />
              Ajouter un lien
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableLinks.map((link) => (
              <DropdownMenuItem
                key={link.key}
                onClick={() => addLink(link.key)}
              >
                {link.defaultLabel}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add page button */}
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
            {sections.length > 0 ? (
              <>
                {availablePages.map((page) => (
                  <DropdownMenuSub key={page.documentId}>
                    <DropdownMenuSubTrigger>{page.title}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => addPage(page)}>
                        Au niveau principal
                      </DropdownMenuItem>
                      {sections.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => addPage(page, s.id)}>
                          Dans « {s.label} »
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </>
            ) : (
              availablePages.map((page) => (
                <DropdownMenuItem
                  key={page.documentId}
                  onClick={() => addPage(page)}
                >
                  {page.title}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add section button */}
        {showSectionInput ? (
          <div className="flex items-center gap-2">
            <Input
              value={newSectionLabel}
              onChange={(e) => setNewSectionLabel(e.target.value)}
              placeholder="Nom de la section"
              className="h-8 w-48 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addSection() }
                if (e.key === 'Escape') { setShowSectionInput(false); setNewSectionLabel('') }
              }}
              autoFocus
            />
            <Button type="button" variant="default" size="sm" onClick={addSection} disabled={!newSectionLabel.trim()}>
              Ajouter
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowSectionInput(false); setNewSectionLabel('') }}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSectionInput(true)}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Ajouter une section
          </Button>
        )}

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
