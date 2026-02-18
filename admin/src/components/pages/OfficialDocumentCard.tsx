import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Archive, Eye, FileText, MoreVertical, Pencil, Trash2, Upload } from 'lucide-react'
import type { OfficialDocument } from '../../hooks/api/useOfficialDocuments'
import { StatusBadge } from '../common'

interface OfficialDocumentCardProps {
  document: OfficialDocument
  onEdit: (doc: OfficialDocument) => void
  onView: (doc: OfficialDocument) => void
  onDelete: (doc: OfficialDocument) => void
  onPublish?: (doc: OfficialDocument) => void
  onArchive?: (doc: OfficialDocument) => void
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'pv-conseil-municipal': 'PV de conseil municipal',
  'deliberation': 'Délibération',
  'arrete': 'Arrêté',
  'plu': 'PLU',
  'scot': 'SCoT',
  'carte-communale': 'Carte communale',
  'budget-primitif': 'Budget primitif',
  'compte-administratif': 'Compte administratif',
  'rapport-orientations-budgetaires': 'ROB',
  'autre': 'Autre',
}

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  'pv-conseil-municipal': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'deliberation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'arrete': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'plu': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'scot': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'carte-communale': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'budget-primitif': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'compte-administratif': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'rapport-orientations-budgetaires': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'autre': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export const OfficialDocumentCard = ({
  document: doc, onEdit, onView, onDelete, onPublish, onArchive
}: OfficialDocumentCardProps) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR')

  return (
    <div className="flex h-full flex-col rounded-md border bg-card p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={doc.status} />
            <Badge className={DOCUMENT_TYPE_COLORS[doc.document_type] || ''}>
              {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(doc)}>
                <Eye className="mr-2 h-4 w-4" /> Voir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(doc)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onPublish && doc.status !== 'published' && (
                <DropdownMenuItem onClick={() => onPublish(doc)}>
                  <Upload className="mr-2 h-4 w-4" /> Publier
                </DropdownMenuItem>
              )}
              {onArchive && doc.status !== 'archived' && (
                <DropdownMenuItem onClick={() => onArchive(doc)}>
                  <Archive className="mr-2 h-4 w-4" /> Archiver
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(doc)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h3 className="text-lg font-semibold leading-tight">{doc.title}</h3>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3">
        {doc.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{doc.description}</p>
        )}

        <div className="mt-auto space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>PDF</span>
          </div>
          <div className="flex w-full justify-between">
            <span>Date : {formatDate(doc.document_date)}</span>
            <span>{doc.year}</span>
          </div>
          {doc.reference_number && <p>Réf. {doc.reference_number}</p>}
        </div>
      </div>
    </div>
  )
}
