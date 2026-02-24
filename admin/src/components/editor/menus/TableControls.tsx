import {
  ArrowDownToLine,
  ArrowRightToLine,
  Columns2,
  Rows2,
  Trash2,
  ToggleLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Editor } from '../types'

interface TableControlsProps {
  editor: Editor
}

function ControlButton({
  onClick,
  children,
  title,
  variant = 'default',
}: {
  onClick: () => void
  children: React.ReactNode
  title: string
  variant?: 'default' | 'destructive'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'rounded p-1 text-xs transition-colors',
        variant === 'destructive'
          ? 'hover:bg-destructive/10 hover:text-destructive'
          : 'hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}

export function TableControls({ editor }: TableControlsProps) {
  if (!editor.isActive('table')) return null

  return (
    <div className="flex items-center gap-0.5 border-t border-input bg-muted/30 px-2 py-1">
      <span className="mr-2 text-xs font-medium text-muted-foreground">Tableau :</span>

      <ControlButton
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Ajouter une colonne"
      >
        <ArrowRightToLine className="h-3.5 w-3.5" />
      </ControlButton>

      <ControlButton
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Supprimer la colonne"
      >
        <Columns2 className="h-3.5 w-3.5" />
      </ControlButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ControlButton
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Ajouter une ligne"
      >
        <ArrowDownToLine className="h-3.5 w-3.5" />
      </ControlButton>

      <ControlButton
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Supprimer la ligne"
      >
        <Rows2 className="h-3.5 w-3.5" />
      </ControlButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ControlButton
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        title="En-tête de ligne"
      >
        <ToggleLeft className="h-3.5 w-3.5" />
      </ControlButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ControlButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Supprimer le tableau"
        variant="destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ControlButton>
    </div>
  )
}
