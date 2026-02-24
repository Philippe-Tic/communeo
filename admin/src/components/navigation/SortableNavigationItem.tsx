import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { GripVertical, Trash2, FileText, LayoutGrid } from 'lucide-react'
import type { NavigationItem } from '../../hooks/api/useSites'
import { getSectionDefinition } from '../../lib/navigation'

interface SortableNavigationItemProps {
  item: NavigationItem
  pageTitle?: string
  onUpdate: (id: string, updates: Partial<NavigationItem>) => void
  onRemove: (id: string) => void
}

export const SortableNavigationItem = ({
  item,
  pageTitle,
  onUpdate,
  onRemove,
}: SortableNavigationItemProps) => {
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

  return (
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
  )
}
