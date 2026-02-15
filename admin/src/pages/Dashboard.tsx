import { Button } from '@/components/ui/button'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout'
import { ArticleCard, StatsCard } from '../components/pages'
import { useArticles, type Article } from '../hooks/api/useArticles'
import { useEvents } from '../hooks/api/useEvents'
import { usePages } from '../hooks/api/usePages'
import { useUser, useUserProfile } from '../hooks/useUser'

export const Dashboard = () => {
  const { fullName, user } = useUser()
  const { firstName } = useUserProfile()
  const navigate = useNavigate()

  // Fetch data for stats
  const { data: articlesData, isLoading: articlesLoading } = useArticles()
  const { data: pagesData, isLoading: pagesLoading } = usePages()
  const { data: eventsData, isLoading: eventsLoading } = useEvents()

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
      icon: '📝'
    },
    {
      label: 'Pages',
      value: pagesLoading ? '...' : pages.length,
      color: 'green',
      icon: '📄'
    },
    {
      label: 'Événements',
      value: eventsLoading ? '...' : events.length,
      color: 'purple',
      icon: '📅'
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
      <div className="flex flex-col gap-8">
        <PageHeader
          title={`Bienvenue, ${firstName || fullName || 'Admin'} !`}
          subtitle={`Voici un aperçu de votre tableau de bord${user?.site ? ` - ${user.site.name}` : ''}`}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                  📝 Nouvel article
                </Button>
              </RouterLink>
              <RouterLink to="/events/new">
                <Button size="sm" variant="outline">
                  📅 Nouvel événement
                </Button>
              </RouterLink>
              <RouterLink to="/pages/new">
                <Button size="sm" variant="outline">
                  📄 Nouvelle page
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
