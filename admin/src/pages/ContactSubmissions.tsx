import { Badge } from '@/components/ui/badge'
import { CONTACT_CATEGORY_LABELS, CONTACT_CATEGORY_OPTIONS, CONTACT_STATUS_CONFIG, CONTACT_STATUS_OPTIONS } from '@/lib/constants/contact-types'
import { formatDate } from '@/lib/format'
import { Clock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/common'
import { FilterPanel, PageHeader } from '../components/layout'
import {
  useContactSubmissions,
  useDeleteContactSubmission,
  type ContactSubmission,
} from '../hooks/api/useContactSubmissions'
import { toaster } from '../lib/toaster'

export const ContactSubmissions = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Record<string, string>>({
    search: '',
    status: '',
    category: '',
  })
  const [currentPage] = useState(1)
  const [submissionToDelete, setSubmissionToDelete] = useState<ContactSubmission | null>(null)

  const { data: submissionsData, isLoading, error } = useContactSubmissions({
    page: currentPage,
    pageSize: 50,
    search: filters.search || undefined,
    status: filters.status as ContactSubmission['status'] || undefined,
    category: filters.category as ContactSubmission['category'] || undefined,
  })

  const deleteMutation = useDeleteContactSubmission()

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDelete = async () => {
    if (!submissionToDelete) return

    try {
      await deleteMutation.mutateAsync(submissionToDelete.documentId)
      toaster.create({
        title: 'Message supprimé',
        description: `Le message "${submissionToDelete.reference_number}" a été supprimé.`,
        type: 'success',
        duration: 3000,
      })
      setSubmissionToDelete(null)
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const filterFields = [
    {
      key: 'search',
      label: 'Recherche',
      type: 'text' as const,
      placeholder: 'Rechercher par nom, email ou référence...',
    },
    {
      key: 'status',
      label: 'Statut',
      type: 'select' as const,
      options: CONTACT_STATUS_OPTIONS,
    },
    {
      key: 'category',
      label: 'Catégorie',
      type: 'select' as const,
      options: CONTACT_CATEGORY_OPTIONS,
    },
  ]

  const submissions = submissionsData?.data || []

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Messages"
          subtitle="Gérez les messages reçus via le formulaire de contact"
        />

        <FilterPanel
          filters={filters}
          fields={filterFields}
          onChange={handleFilterChange}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Chargement...</div>
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            Une erreur est survenue lors du chargement des messages.
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Mail className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Aucun message trouvé</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Référence</th>
                  <th className="px-4 py-3 text-left font-medium">Expéditeur</th>
                  <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Objet</th>
                  <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Catégorie</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.map((submission) => {
                  const statusConfig = CONTACT_STATUS_CONFIG[submission.status] || CONTACT_STATUS_CONFIG.received
                  return (
                    <tr
                      key={submission.documentId}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/messages/${submission.documentId}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-medium text-primary">
                          {submission.reference_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">
                            {submission.first_name} {submission.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{submission.email}</p>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <p className="max-w-[200px] truncate">{submission.subject}</p>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {CONTACT_CATEGORY_LABELS[submission.category] || submission.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusConfig.className}>
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {formatDate(submission.createdAt)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <ConfirmDialog
          isOpen={!!submissionToDelete}
          onClose={() => setSubmissionToDelete(null)}
          onConfirm={handleDelete}
          title="Supprimer le message"
          message={`Êtes-vous sûr de vouloir supprimer le message "${submissionToDelete?.reference_number}" ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          isLoading={deleteMutation.isPending}
          type="danger"
        />
      </div>
    </div>
  )
}
