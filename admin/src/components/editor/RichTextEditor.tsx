import { useEffect, useState } from 'react'
import { EditorContent } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { MediaPickerDialog } from '../forms/MediaPickerDialog'
import { useRichTextEditor } from './useRichTextEditor'
import { useAutoSave } from './useAutoSave'
import { EditorToolbar } from './toolbar/EditorToolbar'
import { LinkDialog } from './dialogs/LinkDialog'
import { CtaDialog } from './dialogs/CtaDialog'
import { VideoEmbedDialog } from './dialogs/VideoEmbedDialog'
import { TemplateDialog } from './dialogs/TemplateDialog'
import { BlockPickerDialog } from './dialogs/BlockPickerDialog'
import { EditorBubbleMenu } from './menus/EditorBubbleMenu'
import { EditorFooter } from './footer/EditorFooter'
import { TableControls } from './menus/TableControls'
import type { RichTextEditorProps } from './types'

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  error,
  variant = 'compact',
  autoSaveId,
}: RichTextEditorProps) {
  const { editor, isFull } = useRichTextEditor({
    value,
    onChange,
    placeholder,
    variant,
  })

  const { hasDraft, restoreDraft, dismissDraft } = useAutoSave({
    editor,
    formId: autoSaveId,
    enabled: isFull && !!autoSaveId,
  })

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [imagePickerOpen, setImagePickerOpen] = useState(false)
  const [ctaDialogOpen, setCtaDialogOpen] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [blockPickerOpen, setBlockPickerOpen] = useState(false)

  // Wire slash command callbacks to open dialogs
  useEffect(() => {
    if (!editor || !isFull) return
    const storage = (editor.storage as any).slashCommands
    if (storage) {
      storage.onImageRequest = () => setImagePickerOpen(true)
      storage.onVideoRequest = () => setVideoDialogOpen(true)
      storage.onCtaRequest = () => setCtaDialogOpen(true)
    }
  }, [editor, isFull])

  if (!editor) return null

  const handleImageSelected = (media: { url: string; alt: string }) => {
    ;(editor.commands as any).setResizableImage({ src: media.url, alt: media.alt })
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
      {/* Auto-save restoration banner */}
      {hasDraft && (
        <div className="mb-2 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <span className="flex-1 text-amber-800 dark:text-amber-200">
            Un brouillon non sauvegardé a été trouvé.
          </span>
          <button
            type="button"
            onClick={restoreDraft}
            className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
          >
            Restaurer
          </button>
          <button
            type="button"
            onClick={dismissDraft}
            className="text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400"
          >
            Ignorer
          </button>
        </div>
      )}

      <div
        className={cn(
          'rounded-md border border-input bg-background',
          error && 'border-destructive',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background'
        )}
      >
        <EditorToolbar
          editor={editor}
          isFull={isFull}
          onOpenLinkDialog={() => setLinkDialogOpen(true)}
          onOpenImagePicker={() => setImagePickerOpen(true)}
          onOpenCtaDialog={() => setCtaDialogOpen(true)}
          onOpenVideoDialog={() => setVideoDialogOpen(true)}
          onOpenTemplateDialog={() => setTemplateDialogOpen(true)}
          onOpenBlockPicker={() => setBlockPickerOpen(true)}
          onInsertTable={insertTable}
        />

        {isFull && (
          <EditorBubbleMenu
            editor={editor}
            onOpenLinkDialog={() => setLinkDialogOpen(true)}
          />
        )}

        <EditorContent editor={editor} />

        {isFull && <TableControls editor={editor} />}
        {isFull && <EditorFooter editor={editor} />}
      </div>

      <LinkDialog
        editor={editor}
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
      />

      {isFull && (
        <MediaPickerDialog
          open={imagePickerOpen}
          onOpenChange={setImagePickerOpen}
          onSelect={handleImageSelected}
          accept="image"
          showUrlTab
        />
      )}

      {isFull && (
        <CtaDialog
          editor={editor}
          open={ctaDialogOpen}
          onOpenChange={setCtaDialogOpen}
        />
      )}

      {isFull && (
        <VideoEmbedDialog
          editor={editor}
          open={videoDialogOpen}
          onOpenChange={setVideoDialogOpen}
        />
      )}

      {isFull && (
        <TemplateDialog
          editor={editor}
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
        />
      )}

      {isFull && (
        <BlockPickerDialog
          editor={editor}
          open={blockPickerOpen}
          onOpenChange={setBlockPickerOpen}
        />
      )}
    </>
  )
}
