import { useEffect } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import { ResizableImage } from './extensions/ResizableImage'
import { SlashCommands } from './extensions/SlashCommands'
import { DragHandle } from './extensions/DragHandle'
import { Columns, Column } from './extensions/Columns'
import { FontSize } from './extensions/FontSize'
import { LineHeight } from './extensions/LineHeight'
import { Callout } from './extensions/Callout'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'
import type { EditorVariant } from './types'

interface UseRichTextEditorOptions {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  variant: EditorVariant
}

export function useRichTextEditor({
  value,
  onChange,
  placeholder,
  variant,
}: UseRichTextEditorOptions) {
  const isFull = variant === 'full'

  const extensions = [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    ...(isFull
      ? [
          ResizableImage,
          Table.configure({ resizable: true }),
          TableRow,
          TableHeader,
          TableCell,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          }),
          TextStyle,
          Color,
          Highlight.configure({ multicolor: true }),
          CharacterCount,
          TaskList,
          TaskItem.configure({ nested: true }),
          Superscript,
          Subscript,
          Callout,
          SlashCommands,
          DragHandle,
          Columns,
          Column,
          FontSize,
          LineHeight,
          Placeholder.configure({
            placeholder: ({ node }) => {
              if (node.type.name === 'heading') return 'Titre...'
              return placeholder || 'Tapez "/" pour les commandes...'
            },
          }),
        ]
      : []),
  ]

  const editor = useEditor({
    extensions,
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          isFull ? 'min-h-[300px] px-4 py-3' : 'min-h-[120px] px-3 py-2'
        ),
      },
    },
  })

  // Sync external value changes
  useEffect(() => {
    if (
      editor &&
      value !== editor.getHTML() &&
      value !== (editor.getHTML() === '<p></p>' ? '' : editor.getHTML())
    ) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  return { editor, isFull }
}
