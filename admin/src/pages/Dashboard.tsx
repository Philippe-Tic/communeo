import { Box, Button, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
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
    <Box maxW="full" mx="auto">
      <VStack gap={8} align="stretch">
        <PageHeader
          title={`Bienvenue, ${firstName || fullName || 'Admin'} !`}
          subtitle={`Voici un aperçu de votre tableau de bord${user?.site ? ` - ${user.site.name}` : ''}`}
        />

        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 3, lg: 3 }} gap={6}>
          {statsData.map((stat, index) => (
            <StatsCard
              key={index}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              icon={stat.icon}
            />
          ))}
        </SimpleGrid>

        {/* Quick Actions */}
        <Box>
          <VStack gap={4} align="stretch">
            <HStack justify="space-between" align="center">
              <Heading size="md" color="gray.700">
                Actions rapides
              </Heading>
            </HStack>

            <HStack gap={4} wrap="wrap">
              <RouterLink to="/articles/new">
                <Button
                  colorScheme="blue"
                  size="sm"
                >
                  📝 Nouvel article
                </Button>
              </RouterLink>
              <RouterLink to="/events/new">
                <Button
                  colorScheme="purple"
                  size="sm"
                >
                  📅 Nouvel événement
                </Button>
              </RouterLink>
              <RouterLink to="/pages/new">
                <Button
                  colorScheme="green"
                  size="sm"
                >
                  📄 Nouvelle page
                </Button>
              </RouterLink>
            </HStack>
          </VStack>
        </Box>

        <Box height="1px" bg="gray.200" />

        {/* Recent Articles */}
        {recentArticles.length > 0 && (
          <Box>
            <VStack gap={4} align="stretch">
              <HStack justify="space-between" align="center">
                <Heading size="md" color="gray.700">
                  Articles récents
                </Heading>
                <RouterLink to="/articles">
                  <Button
                    variant="ghost"
                    size="sm"
                    colorScheme="blue"
                  >
                    Voir tout
                  </Button>
                </RouterLink>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                {recentArticles.map((article) => (
                  <ArticleCard
                    key={article.documentId}
                    article={article}
                    onView={handleArticleView}
                    onEdit={handleArticleEdit}
                    onDelete={handleArticleDelete}
                  />
                ))}
              </SimpleGrid>
            </VStack>
          </Box>
        )}

        {/* Empty state messages */}
        {recentArticles.length === 0 && !articlesLoading && (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" mb={4}>
              Aucun article publié pour le moment
            </Text>
            <RouterLink to="/articles/new">
              <Button
                colorScheme="blue"
                size="sm"
              >
                Créer votre premier article
              </Button>
            </RouterLink>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
