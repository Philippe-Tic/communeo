import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSite } from '@/hooks/api/useSites'
import { useUserSite } from '@/hooks/useUser'
import { AlertTriangle, Calendar, CheckCircle2, ChevronRight, Clock, File, FileText, Mail, MapPin, Rocket, XCircle } from 'lucide-react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout'
import { ArticleCard, StatsCard } from '../components/pages'
import { useArticles, type Article } from '../hooks/api/useArticles'
import { useEvents, useUpcomingEvents } from '../hooks/api/useEvents'
import { useContactSubmissions, useContactSubmissionsCount } from '../hooks/api/useContactSubmissions'
import { usePages } from '../hooks/api/usePages'
import { usePendingAssociationsCount } from '../hooks/api/useAssociations'
import { useUser, useUserProfile } from '../hooks/useUser'
import useDeployment from '../hooks/useDeployment'

export const Dashboard = () => {
  const { fullName, user } = useUser()
  const { firstName } = useUserProfile()
  const { site: userSite } = useUserSite()
  const navigate = useNavigate()

  // Fetch site data for legal config check
  const { data: siteData } = useSite(userSite?.documentId || '')

  // Fetch data for stats
  const { data: articlesData, isLoading: articlesLoading } = useArticles()
  const { data: pagesData, isLoading: pagesLoading } = usePages()
  const { data: eventsData, isLoading: eventsLoading } = useEvents()
  const { data: messagesCount, isLoading: messagesLoading } = useContactSubmissionsCount()

  // Additional data for enriched dashboard
  const { data: upcomingEvents } = useUpcomingEvents(4)
  const { data: recentMessages } = useContactSubmissions({ pageSize: 3, status: 'received' })
  const { currentDeployment } = useDeployment()
  const { data: pendingAssociationsCount } = usePendingAssociationsCount()

  // Fetch recent content
  const { data: recentArticlesData } = useArticles({ status: 'published', pageSize: 3 })

  // Extract arrays from API responses
  const articles = articlesData?.data || []
  const pages = pagesData?.data || []
  const events = eventsData?.data || []
  const recentArticles = recentArticlesData?.data || []
  const unreadMessages = recentMessages?.data || []

  const statsData = [
    {
      label: 'Articles',
      value: articles.length,
      color: 'blue',
      icon: <FileText className="h-6 w-6" />,
      isLoading: articlesLoading,
    },
    {
      label: 'Pages',
      value: pages.length,
      color: 'green',
      icon: <File className="h-6 w-6" />,
      isLoading: pagesLoading,
    },
    {
      label: 'Événements',
      value: events.length,
      color: 'purple',
      icon: <Calendar className="h-6 w-6" />,
      isLoading: eventsLoading,
    },
    {
      label: 'Messages',
      value: messagesCount ?? 0,
      color: 'orange',
      icon: <Mail className="h-6 w-6" />,
      isLoading: messagesLoading,
    },
  ]

  // Conformity progress
  const conformityChecks = siteData ? [
    { label: 'SIRET', ok: !!siteData.mentions_legales?.siret },
    { label: 'Directeur de publication', ok: !!siteData.mentions_legales?.publication_director },
    { label: 'Hébergeur', ok: !!siteData.mentions_legales?.hebergeur_name },
    { label: 'DPO', ok: !!siteData.rgpd?.dpo_name },
    { label: 'Politique RGPD', ok: typeof siteData.rgpd?.rgpd_policy === 'string' && siteData.rgpd.rgpd_policy.trim().length >= 50 },
    { label: 'Niveau accessibilité', ok: !!siteData.accessibilite?.accessibility_level },
    { label: 'Email de contact', ok: !!siteData.contact_mail },
    { label: 'Adresse', ok: !!siteData.address },
  ] : []
  const conformityDone = conformityChecks.filter(c => c.ok).length
  const conformityTotal = conformityChecks.length
  const conformityPercent = conformityTotal > 0 ? Math.round((conformityDone / conformityTotal) * 100) : 0

  // Deployment status
  const deploymentStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    building: { label: 'En cours', color: 'text-blue-600 dark:text-blue-400', icon: <Clock className="h-4 w-4 animate-spin" /> },
    ready: { label: 'Succès', color: 'text-green-600 dark:text-green-400', icon: <CheckCircle2 className="h-4 w-4" /> },
    error: { label: 'Échec', color: 'text-red-600 dark:text-red-400', icon: <XCircle className="h-4 w-4" /> },
  }

  // Callbacks for article cards
  const handleArticleView = (article: Article) => {
    navigate(`/articles/${article.documentId}`)
  }

  const handleArticleEdit = (article: Article) => {
    navigate(`/articles/${article.documentId}/edit`)
  }

  const handleArticleDelete = () => {
    // Empty function for dashboard - deletion not allowed from here
  }

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-col gap-6">
        <PageHeader
          title={`Bienvenue, ${firstName || fullName || 'Admin'} !`}
          subtitle={`Voici un aperçu de votre tableau de bord${user?.site ? ` - ${user.site.name}` : ''}`}
        />

        {/* Legal config incomplete banner */}
        {siteData && (() => {
          const ml = siteData.mentions_legales
          const rgpd = siteData.rgpd
          const missing = [
            !ml?.siret && 'SIRET',
            !ml?.publication_director && 'Directeur de publication',
            !ml?.hebergeur_name && 'Hébergeur',
            !rgpd?.dpo_name && 'DPO',
            !(typeof rgpd?.rgpd_policy === 'string' && rgpd.rgpd_policy.trim().length >= 50) && 'Politique RGPD',
          ].filter(Boolean) as string[]
          if (missing.length === 0) return null
          return (
            <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
              <div className="text-sm">
                <p className="font-medium text-orange-800 dark:text-orange-300">
                  Configuration légale incomplète
                </p>
                <p className="mt-1 text-orange-700 dark:text-orange-400">
                  Il manque : {missing.join(', ')}.{' '}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-orange-700 underline dark:text-orange-400"
                    onClick={() => navigate('/site/edit')}
                  >
                    Compléter la configuration
                  </Button>
                </p>
              </div>
            </div>
          )
        })()}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {statsData.map((stat, index) => (
            <StatsCard
              key={index}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              icon={stat.icon}
              isLoading={stat.isLoading}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Actions rapides
              </h3>
            </div>

            <div className="flex flex-wrap gap-4">
              <RouterLink to="/articles/new">
                <Button size="sm">
                  Nouvel article
                </Button>
              </RouterLink>
              <RouterLink to="/events/new">
                <Button size="sm" variant="outline">
                  Nouvel événement
                </Button>
              </RouterLink>
              <RouterLink to="/pages/new">
                <Button size="sm" variant="outline">
                  Nouvelle page
                </Button>
              </RouterLink>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Two-column layout: Messages + Deployment/Conformity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Unread Messages */}
          <div className="rounded-lg border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Mail className="h-4 w-4 text-orange-500" />
                Messages non lus
                {(messagesCount ?? 0) > 0 && (
                  <Badge variant="default" className="ml-1 h-5 min-w-5 px-1.5 text-[10px]">
                    {messagesCount}
                  </Badge>
                )}
              </h3>
              <RouterLink to="/messages">
                <Button variant="ghost" size="sm" className="text-xs">
                  Voir tout <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </RouterLink>
            </div>
            {unreadMessages.length > 0 ? (
              <div className="flex flex-col gap-2">
                {unreadMessages.map((msg) => (
                  <button
                    key={msg.documentId}
                    onClick={() => navigate(`/messages/${msg.documentId}`)}
                    className="flex items-start gap-3 rounded-md p-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                      {msg.first_name?.charAt(0)}{msg.last_name?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{msg.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {msg.first_name} {msg.last_name} &middot; {new Date(msg.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Aucun message non lu
              </p>
            )}
          </div>

          {/* Right column: Deployment + Conformity */}
          <div className="flex flex-col gap-6">
            {/* Last Deployment */}
            <div className="rounded-lg border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Rocket className="h-4 w-4 text-blue-500" />
                  Dernier déploiement
                </h3>
                <RouterLink to="/deployment">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Gérer <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </RouterLink>
              </div>
              {currentDeployment ? (
                <div className="flex items-center gap-3">
                  <div className={deploymentStatusConfig[currentDeployment.status]?.color || 'text-muted-foreground'}>
                    {deploymentStatusConfig[currentDeployment.status]?.icon}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${deploymentStatusConfig[currentDeployment.status]?.color || ''}`}>
                      {deploymentStatusConfig[currentDeployment.status]?.label || currentDeployment.status}
                    </p>
                    {currentDeployment.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(currentDeployment.createdAt).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun déploiement</p>
              )}
            </div>

            {/* Conformity Progress */}
            {conformityTotal > 0 && (
              <div className="rounded-lg border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">
                    Conformité légale
                  </h3>
                  <RouterLink to="/compliance">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Détails <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </RouterLink>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${conformityPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {conformityDone}/{conformityTotal}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {conformityChecks.map((check) => (
                    <Badge
                      key={check.label}
                      variant={check.ok ? 'secondary' : 'outline'}
                      className={check.ok ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}
                    >
                      {check.ok ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                      {check.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Pending associations notification */}
            {(pendingAssociationsCount ?? 0) > 0 && (
              <button
                onClick={() => navigate('/associations')}
                className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-left transition-colors hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-950/30 dark:hover:bg-yellow-950/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                  {pendingAssociationsCount}
                </div>
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    {pendingAssociationsCount === 1 ? 'Association en attente de modération' : 'Associations en attente de modération'}
                  </p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-yellow-600" />
              </button>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">
                    Prochains événements
                  </h3>
                  <RouterLink to="/events">
                    <Button variant="ghost" size="sm">
                      Voir tout
                    </Button>
                  </RouterLink>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {upcomingEvents.map((event) => (
                    <button
                      key={event.documentId}
                      onClick={() => navigate(`/events/${event.documentId}`)}
                      className="flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-shadow hover:shadow-md"
                    >
                      <div className="flex shrink-0 flex-col items-center rounded-md bg-primary/10 px-3 py-1.5 text-primary">
                        <span className="text-lg font-bold leading-tight">
                          {new Date(event.start_date).getDate()}
                        </span>
                        <span className="text-[10px] font-medium uppercase">
                          {new Date(event.start_date).toLocaleDateString('fr-FR', { month: 'short' })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{event.title}</p>
                        {event.location && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" /> {event.location}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(event.start_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="h-px bg-border" />

        {/* Recent Articles */}
        {recentArticles.length > 0 && (
          <div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  Articles récents
                </h3>
                <RouterLink to="/articles">
                  <Button variant="ghost" size="sm">
                    Voir tout
                  </Button>
                </RouterLink>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recentArticles.map((article) => (
                  <ArticleCard
                    key={article.documentId}
                    article={article}
                    onView={handleArticleView}
                    onEdit={handleArticleEdit}
                    onDelete={handleArticleDelete}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state messages */}
        {recentArticles.length === 0 && !articlesLoading && (
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">
              Aucun article publié pour le moment
            </p>
            <RouterLink to="/articles/new">
              <Button size="sm">
                Créer votre premier article
              </Button>
            </RouterLink>
          </div>
        )}
      </div>
    </div>
  )
}
