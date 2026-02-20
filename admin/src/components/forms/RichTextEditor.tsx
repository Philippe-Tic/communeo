import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MediaPickerDialog } from './MediaPickerDialog'
import { cn } from '@/lib/utils'
import Color from '@tiptap/extension-color'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  LinkIcon as CtaIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: boolean
  variant?: 'compact' | 'full'
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded p-1.5 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed',
        active && 'bg-muted text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return <div className="mx-1 w-px self-stretch bg-border" />
}

const COLORS = [
  { label: 'Par défaut', value: '' },
  { label: 'Rouge', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Vert', value: '#16a34a' },
  { label: 'Bleu', value: '#2563eb' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Gris', value: '#6b7280' },
]

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  error,
  variant = 'compact',
}: RichTextEditorProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [ctaDialogOpen, setCtaDialogOpen] = useState(false)
  const [ctaUrl, setCtaUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [colorOpen, setColorOpen] = useState(false)
  const colorRef = useRef<HTMLDivElement>(null)

  const isFull = variant === 'full'

  const extensions = [
    StarterKit.configure({
      heading: { levels: [2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    ...(isFull
      ? [
          Image.configure({
            HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
          }),
          Table.configure({ resizable: false }),
          TableRow,
          TableHeader,
          TableCell,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
          }),
          TextStyle,
          Color,
          Placeholder.configure({
            placeholder: placeholder || 'Commencez à écrire...',
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

  useEffect(() => {
    if (
      editor &&
      value !== editor.getHTML() &&
      value !== (editor.getHTML() === '<p></p>' ? '' : editor.getHTML())
    ) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  // Close color picker on outside click
  useEffect(() => {
    if (!colorOpen) return
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setColorOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colorOpen])

  if (!editor) return null

  const openLinkDialog = () => {
    const existing = editor.getAttributes('link').href || ''
    setLinkUrl(existing)
    setLinkDialogOpen(true)
  }

  const confirmLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setLinkDialogOpen(false)
    setLinkUrl('')
  }

  const openImagePicker = () => {
    setImagePickerOpen(true)
  }

  const handleImageSelected = (media: { url: string; alt: string }) => {
    editor.chain().focus().setImage({ src: media.url, alt: media.alt }).run()
  }

  const openCtaDialog = () => {
    setCtaUrl('')
    setCtaLabel('')
    setCtaDialogOpen(true)
  }

  const confirmCta = () => {
    if (ctaUrl && ctaLabel) {
      editor
        .chain()
        .focus()
        .insertContent(
          `<a href="${ctaUrl}" class="btn-primary">${ctaLabel}</a>`
        )
        .run()
    }
    setCtaDialogOpen(false)
    setCtaUrl('')
    setCtaLabel('')
  }

  const insertTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  }

  return (
    <>
      <div
        className={cn(
          'rounded-md border border-input bg-background',
          error && 'border-destructive',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background'
        )}
      >
        {/* Toolbar */}
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

          <ToolbarSeparator />

          {/* Headings */}
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive('heading', { level: 2 })}
            title="Titre 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive('heading', { level: 3 })}
            title="Titre 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

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
            onClick={openLinkDialog}
            active={editor.isActive('link')}
            title="Lien"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>

          {/* Full variant extras */}
          {isFull && (
            <>
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
              <ToolbarButton onClick={openImagePicker} title="Image">
                <ImageIcon className="h-4 w-4" />
              </ToolbarButton>

              {/* Table */}
              <ToolbarButton onClick={insertTable} title="Tableau">
                <TableIcon className="h-4 w-4" />
              </ToolbarButton>

              {/* CTA Button */}
              <ToolbarButton onClick={openCtaDialog} title="Bouton CTA">
                <CtaIcon className="h-4 w-4" />
              </ToolbarButton>

              {/* Color */}
              <div className="relative" ref={colorRef}>
                <ToolbarButton
                  onClick={() => setColorOpen(!colorOpen)}
                  title="Couleur du texte"
                >
                  <Palette className="h-4 w-4" />
                </ToolbarButton>
                {colorOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover p-2 shadow-md">
                    <div className="flex gap-1">
                      {COLORS.map((c) => (
                        <button
                          key={c.value || 'default'}
                          type="button"
                          title={c.label}
                          onClick={() => {
                            if (c.value) {
                              editor.chain().focus().setColor(c.value).run()
                            } else {
                              editor.chain().focus().unsetColor().run()
                            }
                            setColorOpen(false)
                          }}
                          className={cn(
                            'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                            !c.value && 'bg-foreground',
                            editor.isActive('textStyle', { color: c.value }) &&
                              'ring-2 ring-ring ring-offset-2'
                          )}
                          style={c.value ? { backgroundColor: c.value } : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Editor content */}
        <EditorContent editor={editor} />
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Insérer un lien</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div>
              <Label className="mb-2">URL</Label>
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmLink()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (editor.isActive('link')) {
                  editor.chain().focus().unsetLink().run()
                }
                setLinkDialogOpen(false)
              }}
            >
              {editor.isActive('link') ? 'Supprimer le lien' : 'Annuler'}
            </Button>
            <Button onClick={confirmLink}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Picker Dialog */}
      {isFull && (
        <MediaPickerDialog
          open={imagePickerOpen}
          onOpenChange={setImagePickerOpen}
          onSelect={handleImageSelected}
          accept="image"
          showUrlTab
        />
      )}

      {/* CTA Dialog */}
      {isFull && (
        <Dialog open={ctaDialogOpen} onOpenChange={setCtaDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Insérer un bouton CTA</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div>
                <Label className="mb-2">Texte du bouton</Label>
                <Input
                  placeholder="En savoir plus"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2">URL de destination</Label>
                <Input
                  placeholder="https://..."
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmCta()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCtaDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={confirmCta}
                disabled={!ctaUrl || !ctaLabel}
              >
                Insérer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
