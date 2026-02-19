import { Button } from '@/components/ui/button'
import { useSite } from '@/hooks/api/useSites'
import { useUserSite } from '@/hooks/useUser'
import { AlertTriangle, Calendar, File, FileText, Mail } from 'lucide-react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout'
import { ArticleCard, StatsCard } from '../components/pages'
import { useArticles, type Article } from '../hooks/api/useArticles'
import { useEvents } from '../hooks/api/useEvents'
import { useContactSubmissionsCount } from '../hooks/api/useContactSubmissions'
import { usePages } from '../hooks/api/usePages'
import { useUser, useUserProfile } from '../hooks/useUser'

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

  // Fetch recent content
  const { data: recentArticlesData } = useArticles({ status: 'published', pageSize: 3 })

  // Extract arrays from API responses
  const articles = articlesData?.data || []
  const pages = pagesData?.data || []
  const events = eventsData?.data || []
  const recentArticles = recentArticlesData?.data || []

  const statsData = [
    {
      label: 'Articles',
      value: articlesLoading ? '...' : articles.length,
      color: 'blue',
      icon: <FileText className="h-6 w-6" />
    },
    {
      label: 'Pages',
      value: pagesLoading ? '...' : pages.length,
      color: 'green',
      icon: <File className="h-6 w-6" />
    },
    {
      label: 'Événements',
      value: eventsLoading ? '...' : events.length,
      color: 'purple',
      icon: <Calendar className="h-6 w-6" />
    },
    {
      label: 'Messages',
      value: messagesLoading ? '...' : (messagesCount ?? 0),
      color: 'orange',
      icon: <Mail className="h-6 w-6" />
    },
  ]

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
