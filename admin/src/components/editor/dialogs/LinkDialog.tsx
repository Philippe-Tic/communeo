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
import { usePages } from '@/hooks/api/usePages'
import { useArticles } from '@/hooks/api/useArticles'
import { FileText, Newspaper, Search } from 'lucide-react'
import type { Editor } from '../types'

interface LinkDialogProps {
  editor: Editor
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LinkDialog({ editor, open, onOpenChange }: LinkDialogProps) {
  const [tab, setTab] = useState<'external' | 'internal'>('external')
  const [linkUrl, setLinkUrl] = useState('')
  const [search, setSearch] = useState('')
  const [contentType, setContentType] = useState<'pages' | 'articles'>('pages')

  const { data: pagesData } = usePages({
    search: search || undefined,
    pageSize: 10,
    status: 'published',
  })
  const { data: articlesData } = useArticles({
    search: search || undefined,
    pageSize: 10,
    status: 'published',
  })

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      const existing = editor.getAttributes('link').href || ''
      setLinkUrl(existing)
      setTab(existing.startsWith('/') ? 'internal' : 'external')
      setSearch('')
    }
    onOpenChange(isOpen)
  }

  const confirmLink = (url?: string) => {
    const finalUrl = url || linkUrl
    if (finalUrl) {
      editor.chain().focus().setLink({ href: finalUrl }).run()
    } else {
      editor.chain().focus().unsetLink().run()
    }
    onOpenChange(false)
    setLinkUrl('')
    setSearch('')
  }

  const pages = pagesData?.data || []
  const articles = articlesData?.data || []
  const items = contentType === 'pages' ? pages : articles

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insérer un lien</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              tab === 'external'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setTab('external')}
          >
            URL externe
          </button>
          <button
            type="button"
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              tab === 'internal'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setTab('internal')}
          >
            Lien interne
          </button>
        </div>

        {tab === 'external' ? (
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
        ) : (
          <div className="flex flex-col gap-3 py-4">
            {/* Content type toggle */}
            <div className="flex gap-2">
              <Button
                variant={contentType === 'pages' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setContentType('pages')}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Pages
              </Button>
              <Button
                variant={contentType === 'articles' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setContentType('articles')}
              >
                <Newspaper className="mr-1.5 h-3.5 w-3.5" />
                Articles
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Results */}
            <div className="max-h-[200px] overflow-y-auto rounded-md border">
              {items.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Aucun résultat
                </p>
              ) : (
                items.map((item) => {
                  const slug = contentType === 'pages'
                    ? `/${item.slug}`
                    : `/articles/${item.slug}`
                  return (
                    <button
                      key={item.documentId}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted transition-colors border-b last:border-b-0"
                      onClick={() => confirmLink(slug)}
                    >
                      {contentType === 'pages' ? (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Newspaper className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate font-medium">{item.title}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {slug}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run()
              }
              onOpenChange(false)
            }}
          >
            {editor.isActive('link') ? 'Supprimer le lien' : 'Annuler'}
          </Button>
          {tab === 'external' && (
            <Button onClick={() => confirmLink()}>Confirmer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
