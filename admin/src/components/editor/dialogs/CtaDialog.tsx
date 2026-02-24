import { useState } from 'react'
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
import type { Editor } from '../types'

interface CtaDialogProps {
  editor: Editor
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CtaDialog({ editor, open, onOpenChange }: CtaDialogProps) {
  const [ctaUrl, setCtaUrl] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setCtaUrl('')
      setCtaLabel('')
    }
    onOpenChange(isOpen)
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
    onOpenChange(false)
    setCtaUrl('')
    setCtaLabel('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            onClick={() => onOpenChange(false)}
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
  )
}
