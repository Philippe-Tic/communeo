import { DOCUMENT_TYPE_COLORS, DOCUMENT_TYPE_LABELS } from '@/lib/official-document-types'
import { formatDate } from '@/lib/format'
import { Archive, FileText, Upload } from 'lucide-react'
import type { OfficialDocument } from '../../hooks/api/useOfficialDocuments'
import { CardActionsMenu, CategoryBadge, StatusBadge } from '../common'

interface OfficialDocumentCardProps {
  document: OfficialDocument
  onEdit: (doc: OfficialDocument) => void
  onView: (doc: OfficialDocument) => void
  onDelete: (doc: OfficialDocument) => void
  onPublish?: (doc: OfficialDocument) => void
  onArchive?: (doc: OfficialDocument) => void
}

export const OfficialDocumentCard = ({
  document: doc, onEdit, onView, onDelete, onPublish, onArchive
}: OfficialDocumentCardProps) => {
  const extraActions = [
    ...(onPublish && doc.status !== 'published' ? [{
      label: 'Publier',
      icon: <Upload className="h-4 w-4" />,
      onClick: () => onPublish(doc),
    }] : []),
    ...(onArchive && doc.status !== 'archived' ? [{
      label: 'Archiver',
      icon: <Archive className="h-4 w-4" />,
      onClick: () => onArchive(doc),
    }] : []),
  ]

  return (
    <div className="glass-card flex h-full cursor-pointer flex-col rounded-xl p-4" onClick={() => onView(doc)}>
      {/* Header */}
      <div className="mb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={doc.status} />
            <CategoryBadge value={doc.document_type} labels={DOCUMENT_TYPE_LABELS} colors={DOCUMENT_TYPE_COLORS} />
          </div>

          <CardActionsMenu
            onView={() => onView(doc)}
            onEdit={() => onEdit(doc)}
            onDelete={() => onDelete(doc)}
            extraActions={extraActions}
          />
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
