import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { CONTENT_TEMPLATES, type ContentTemplate } from '../extensions/templates'
import type { Editor } from '../types'

interface TemplateDialogProps {
  editor: Editor
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TemplateDialog({ editor, open, onOpenChange }: TemplateDialogProps) {
  const insertTemplate = (template: ContentTemplate) => {
    editor.chain().focus().insertContent(template.content).run()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insérer un modèle</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-4">
          {CONTENT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                'hover:border-primary hover:bg-accent'
              )}
              onClick={() => insertTemplate(template)}
            >
              <span className="text-lg">{template.icon}</span>
              <span className="text-sm font-medium">{template.title}</span>
              <span className="text-xs text-muted-foreground">{template.description}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
