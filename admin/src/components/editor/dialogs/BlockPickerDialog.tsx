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
import { cn } from '@/lib/utils'
import { useContentBlocks, useCreateContentBlock } from '@/hooks/api/useContentBlocks'
import { Blocks, Loader2, Plus, Search } from 'lucide-react'
import type { Editor } from '../types'

interface BlockPickerDialogProps {
  editor: Editor
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = [
  { value: '', label: 'Tous' },
  { value: 'header', label: 'En-tête' },
  { value: 'content', label: 'Contenu' },
  { value: 'cta', label: 'CTA' },
  { value: 'sidebar', label: 'Barre latérale' },
  { value: 'footer', label: 'Pied de page' },
  { value: 'other', label: 'Autre' },
]

export function BlockPickerDialog({ editor, open, onOpenChange }: BlockPickerDialogProps) {
  const [tab, setTab] = useState<'pick' | 'save'>('pick')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [saveName, setSaveName] = useState('')
  const [saveCategory, setSaveCategory] = useState('content')

  const { data: blocksData, isLoading } = useContentBlocks({
    search: search || undefined,
    category: category || undefined,
    pageSize: 20,
  })
  const createMutation = useCreateContentBlock()

  const blocks = blocksData?.data || []

  const insertBlock = (content: string) => {
    editor.chain().focus().insertContent(content).run()
    onOpenChange(false)
  }

  const saveAsBlock = async () => {
    if (!saveName) return

    // Get current selection or full content
    const { from, to } = editor.state.selection
    const hasSelection = from !== to
    const content = hasSelection
      ? editor.state.doc.textBetween(from, to)
      : editor.getHTML()

    await createMutation.mutateAsync({
      name: saveName,
      content,
      category: saveCategory,
    })

    setSaveName('')
    setTab('pick')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Blocs réutilisables</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              tab === 'pick'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setTab('pick')}
          >
            Insérer un bloc
          </button>
          <button
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              tab === 'save'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setTab('save')}
          >
            Sauvegarder comme bloc
          </button>
        </div>

        {tab === 'pick' ? (
          <div className="flex flex-col gap-3 py-4">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Results */}
            <div className="max-h-[300px] overflow-y-auto rounded-md border">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : blocks.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                  <Blocks className="h-6 w-6" />
                  <p className="text-sm">Aucun bloc trouvé</p>
                </div>
              ) : (
                blocks.map((block) => (
                  <button
                    key={block.documentId}
                    type="button"
                    className="flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted last:border-b-0"
                    onClick={() => insertBlock(block.content)}
                  >
                    <Blocks className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{block.name}</p>
                      <p className="text-xs text-muted-foreground">{block.category}</p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <div>
              <Label className="mb-2">Nom du bloc</Label>
              <Input
                placeholder="Ex : En-tête standard"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2">Catégorie</Label>
              <select
                value={saveCategory}
                onChange={(e) => setSaveCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.filter((c) => c.value).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Le contenu actuel de l'éditeur (ou la sélection) sera sauvegardé comme bloc réutilisable.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          {tab === 'save' && (
            <Button
              onClick={saveAsBlock}
              disabled={!saveName || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sauvegarder
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
