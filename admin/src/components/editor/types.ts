import type { Editor } from '@tiptap/react'

export interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: boolean
  variant?: 'compact' | 'full'
  /** Unique form ID for auto-save (e.g., "page_abc123"). If set, auto-save is enabled. */
  autoSaveId?: string
}

export interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}

export interface ColorOption {
  label: string
  value: string
}

export const COLORS: ColorOption[] = [
  { label: 'Par défaut', value: '' },
  { label: 'Rouge', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Vert', value: '#16a34a' },
  { label: 'Bleu', value: '#2563eb' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Gris', value: '#6b7280' },
]

export type EditorVariant = 'compact' | 'full'

export type { Editor }
