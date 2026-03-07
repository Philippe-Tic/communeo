import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/layout'
import { Mail, Search, Trash2, ToggleLeft, ToggleRight, Users, UserPlus } from 'lucide-react'
import React from 'react'
import {
  useNewsletterSubscribers,
  useNewsletterSubscriberStats,
  useUpdateNewsletterSubscriber,
  useDeleteNewsletterSubscriber,
} from '@/hooks/api/useNewsletterSubscribers'
import apiClient from '@/services/apiClient'
import { toaster } from '@/lib/toaster'

export const NewsletterSubscribers = () => {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [activeFilter, setActiveFilter] = React.useState<string>('all')
  const [deleteTarget, setDeleteTarget] = React.useState<{ documentId: string; email: string } | null>(null)

  const activeParam = activeFilter === 'all' ? undefined : activeFilter === 'active'

  const { data, isLoading } = useNewsletterSubscribers({
    page,
    pageSize: 25,
    search: debouncedSearch,
    active: activeParam,
  })

  const { data: stats } = useNewsletterSubscriberStats()
  const { mutate: updateSubscriber } = useUpdateNewsletterSubscriber()
  const { mutate: deleteSubscriber, isPending: isDeleting } = useDeleteNewsletterSubscriber()

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleToggle = (documentId: string, currentActive: boolean) => {
    updateSubscriber(
      { id: documentId, active: !currentActive },
      {
        onSuccess: () => {
          toaster.create({
            title: currentActive ? 'Abonné désactivé' : 'Abonné réactivé',
            type: 'success',
            duration: 2000,
          })
        },
      }
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteSubscriber(deleteTarget.documentId, {
      onSuccess: () => {
        toaster.create({
          title: 'Abonné supprimé',
          type: 'success',
          duration: 2000,
        })
        setDeleteTarget(null)
      },
    })
  }

  const handleExportCsv = async () => {
    try {
      const response = await apiClient.get<any>('/api/newsletter-subscribers?filters[active][$eq]=true&pagination[pageSize]=10000&sort=subscribed_at:desc')
      const subscribers = response.data || []

      const escapeCsv = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const csvRows = [
        ['Email', 'Prénom', 'Nom', 'Date d\'inscription'].join(','),
        ...subscribers.map((s: any) =>
          [
            escapeCsv(s.email),
            escapeCsv(s.first_name || ''),
            escapeCsv(s.last_name || ''),
            escapeCsv(new Date(s.subscribed_at).toLocaleDateString('fr-FR')),
          ].join(',')
        ),
      ]

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toaster.create({
        title: 'Export réussi',
        description: `${subscribers.length} abonnés exportés`,
        type: 'success',
        duration: 3000,
      })
    } catch {
      toaster.create({
        title: 'Erreur d\'export',
        description: 'Impossible d\'exporter les abonnés',
        type: 'error',
        duration: 3000,
      })
    }
  }

  const pagination = data?.meta?.pagination
  const subscribers = data?.data || []

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Newsletter"
          subtitle="Gestion des abonnés à la newsletter"
          actions={[
            {
              label: 'Exporter en CSV',
              onClick: handleExportCsv,
              variant: 'outline',
            },
          ]}
        />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total abonnés</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Abonnés actifs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <UserPlus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
                <p className="text-sm text-muted-foreground">Nouveaux ce mois</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Date d'inscription</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Aucun abonné trouvé
                  </TableCell>
                </TableRow>
              ) : (
                subscribers.map((subscriber) => (
                  <TableRow key={subscriber.documentId}>
                    <TableCell className="font-medium">{subscriber.email}</TableCell>
                    <TableCell>{subscriber.first_name || '-'}</TableCell>
                    <TableCell>{subscriber.last_name || '-'}</TableCell>
                    <TableCell>
                      {new Date(subscriber.subscribed_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscriber.active ? 'default' : 'secondary'}>
                        {subscriber.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(subscriber.documentId, subscriber.active)}
                          title={subscriber.active ? 'Désactiver' : 'Réactiver'}
                        >
                          {subscriber.active ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget({ documentId: subscriber.documentId, email: subscriber.email })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pageCount > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pagination.total} abonné{pagination.total > 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.pageCount}
                onClick={() => setPage(page + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer l'abonné"
        message={`Voulez-vous vraiment supprimer l'abonné ${deleteTarget?.email} ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        type="danger"
      />
    </div>
  )
}
