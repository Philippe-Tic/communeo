import { Box, SimpleGrid, VStack } from '@chakra-ui/react'
import { PageHeader } from '../components/layout'
import { StatsCard } from '../components/pages'
import { useAuth } from '../hooks/useAuth'

export const Dashboard = () => {
  const { user } = useAuth()

  const statsData = [
    { label: 'Articles', value: '12', color: 'blue', icon: '📝' },
    { label: 'Pages', value: '5', color: 'green', icon: '📄' },
    { label: 'Événements', value: '8', color: 'purple', icon: '📅' },
    { label: 'Visiteurs', value: '1,234', color: 'orange', icon: '👥' },
  ]

  return (
    <Box maxW="full" mx="auto">
      <VStack gap={8} align="stretch">
        <PageHeader
          title={`Bienvenue, ${user?.first_name || 'Admin'} !`}
          subtitle="Voici un aperçu de votre tableau de bord"
        />

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
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
      </VStack>
    </Box>
  )
}
