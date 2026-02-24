import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  LinkIcon as CtaIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
  Blocks,
  CheckSquare,
  Info,
  LayoutTemplate,
  Subscript,
  Superscript,
  Video,
} from 'lucide-react'
import { ToolbarButton } from './ToolbarButton'
import { ToolbarSeparator } from './ToolbarSeparator'
import { HeadingDropdown } from './HeadingDropdown'
import { ColorPicker } from './ColorPicker'
import { HighlightPicker } from './HighlightPicker'
import { TypographyPopover } from './TypographyPopover'
import type { Editor } from '../types'

interface EditorToolbarProps {
  editor: Editor
  isFull: boolean
  onOpenLinkDialog: () => void
  onOpenImagePicker: () => void
  onOpenCtaDialog: () => void
  onOpenVideoDialog: () => void
  onOpenTemplateDialog: () => void
  onOpenBlockPicker: () => void
  onInsertTable: () => void
}

export function EditorToolbar({
  editor,
  isFull,
  onOpenLinkDialog,
  onOpenImagePicker,
  onOpenCtaDialog,
  onOpenVideoDialog,
  onOpenTemplateDialog,
  onOpenBlockPicker,
  onInsertTable,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1.5">
      {/* Undo/Redo */}
      {isFull && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Annuler"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Rétablir"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarSeparator />
        </>
      )}

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Gras"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italique"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Souligné"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      {isFull && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            active={editor.isActive('superscript')}
            title="Exposant"
          >
            <Superscript className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            active={editor.isActive('subscript')}
            title="Indice"
          >
            <Subscript className="h-4 w-4" />
          </ToolbarButton>
        </>
      )}

      <ToolbarSeparator />

      {/* Headings */}
      <HeadingDropdown editor={editor} />

      <ToolbarSeparator />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Liste à puces"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Liste numérotée"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Link */}
      <ToolbarButton
        onClick={onOpenLinkDialog}
        active={editor.isActive('link')}
        title="Lien"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>

      {/* Full variant extras */}
      {isFull && (
        <>
          {/* Task list */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            title="Liste de tâches"
          >
            <CheckSquare className="h-4 w-4" />
          </ToolbarButton>

          {/* Blockquote */}
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleBlockquote().run()
            }
            active={editor.isActive('blockquote')}
            title="Citation"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>

          {/* Horizontal rule */}
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().setHorizontalRule().run()
            }
            title="Ligne horizontale"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          {/* Callout */}
          <ToolbarButton
            onClick={() => (editor.commands as any).setCallout({ calloutType: 'info' })}
            title="Encart info"
          >
            <Info className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Alignment */}
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().setTextAlign('left').run()
            }
            active={editor.isActive({ textAlign: 'left' })}
            title="Aligner à gauche"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().setTextAlign('center').run()
            }
            active={editor.isActive({ textAlign: 'center' })}
            title="Centrer"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().setTextAlign('right').run()
            }
            active={editor.isActive({ textAlign: 'right' })}
            title="Aligner à droite"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Image */}
          <ToolbarButton onClick={onOpenImagePicker} title="Image">
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>

          {/* Video */}
          <ToolbarButton onClick={onOpenVideoDialog} title="Vidéo">
            <Video className="h-4 w-4" />
          </ToolbarButton>

          {/* Table */}
          <ToolbarButton onClick={onInsertTable} title="Tableau">
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>

          {/* CTA Button */}
          <ToolbarButton onClick={onOpenCtaDialog} title="Bouton CTA">
            <CtaIcon className="h-4 w-4" />
          </ToolbarButton>

          {/* Color */}
          <ColorPicker editor={editor} />

          {/* Highlight */}
          <HighlightPicker editor={editor} />

          {/* Typography */}
          <TypographyPopover editor={editor} />

          <ToolbarSeparator />

          {/* Template */}
          <ToolbarButton onClick={onOpenTemplateDialog} title="Modèles de contenu">
            <LayoutTemplate className="h-4 w-4" />
          </ToolbarButton>

          {/* Reusable blocks */}
          <ToolbarButton onClick={onOpenBlockPicker} title="Blocs réutilisables">
            <Blocks className="h-4 w-4" />
          </ToolbarButton>
        </>
      )}
    </div>
  )
}
