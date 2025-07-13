import {
    Box,
    Grid,
    HStack,
    Heading,
    SimpleGrid,
    Text,
    VStack,
    useBreakpointValue,
} from '@chakra-ui/react'
import React from 'react'
import { useAuth } from '../hooks/useAuth'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()

  // Responsive values
  const titleSize = useBreakpointValue({
    base: 'md',
    md: 'lg',
    lg: 'xl'
  }) as 'md' | 'lg' | 'xl'

  const subtitleSize = useBreakpointValue({
    base: 'sm',
    md: 'md'
  }) as 'sm' | 'md'

  const cardPadding = useBreakpointValue({
    base: 4,
    md: 5,
    lg: 6
  })

  const statNumberSize = useBreakpointValue({
    base: 'xl',
    md: '2xl',
    lg: '3xl'
  })

  const statsData = [
    { label: 'Articles', value: '12', color: 'blue' },
    { label: 'Pages', value: '5', color: 'green' },
    { label: 'Événements', value: '8', color: 'purple' },
    { label: 'Visiteurs', value: '1,234', color: 'orange' },
  ]

  return (
    <Box maxW="full" mx="auto">
      <VStack gap={{ base: 4, md: 6, lg: 8 }} align="stretch">
        {/* Header Section */}
        <Box>
          <Heading size={titleSize} mb={2}>
            Tableau de bord
          </Heading>
          <Text
            color="gray.600"
            fontSize={{ base: 'md', md: 'lg' }}
          >
            Bienvenue, {user?.first_name} {user?.last_name}
          </Text>
        </Box>

        {/* Stats Grid */}
        <SimpleGrid
          columns={{ base: 1, sm: 2, lg: 4 }}
          gap={{ base: 4, md: 6 }}
          w="full"
        >
          {statsData.map((stat, index) => (
            <Box
              key={index}
              p={cardPadding}
              shadow={{ base: 'sm', md: 'md' }}
              borderWidth="1px"
              borderRadius="lg"
              bg="white"
              _hover={{
                shadow: { base: 'md', md: 'lg' },
                transform: 'translateY(-2px)',
                transition: 'all 0.2s ease'
              }}
              transition="all 0.2s ease"
            >
              <VStack align="start" gap={{ base: 1, md: 2 }}>
                <Text
                  fontSize={{ base: 'xs', md: 'sm' }}
                  color="gray.600"
                  fontWeight="medium"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  {stat.label}
                </Text>
                <Text
                  fontSize={statNumberSize}
                  fontWeight="bold"
                  color={`${stat.color}.500`}
                  lineHeight="1"
                >
                  {stat.value}
                </Text>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>

        {/* Site Information Section */}
        <Box>
          <Heading
            size={subtitleSize}
            mb={{ base: 3, md: 4 }}
            color="gray.700"
          >
            Informations du site
          </Heading>

          <Grid
            templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
            gap={{ base: 4, md: 6 }}
          >
            {/* Site Info Card */}
            <Box
              p={cardPadding}
              shadow={{ base: 'sm', md: 'md' }}
              borderWidth="1px"
              borderRadius="lg"
              bg="white"
            >
              <VStack align="start" gap={{ base: 3, md: 4 }}>
                <Text
                  fontSize={{ base: 'md', md: 'lg' }}
                  fontWeight="bold"
                  color="gray.700"
                  mb={2}
                >
                  Configuration
                </Text>

                <VStack align="start" gap={3} w="full">
                  <HStack
                    justify="space-between"
                    w="full"
                    flexDirection={{ base: 'column', sm: 'row' }}
                    align={{ base: 'start', sm: 'center' }}
                    gap={{ base: 1, sm: 4 }}
                  >
                    <Text
                      fontWeight="medium"
                      color="gray.600"
                      fontSize={{ base: 'sm', md: 'md' }}
                      minW="fit-content"
                    >
                      Site:
                    </Text>
                    <Text
                      fontSize={{ base: 'sm', md: 'md' }}
                      wordBreak="break-word"
                    >
                      {user?.site?.name}
                    </Text>
                  </HStack>

                  <HStack
                    justify="space-between"
                    w="full"
                    flexDirection={{ base: 'column', sm: 'row' }}
                    align={{ base: 'start', sm: 'center' }}
                    gap={{ base: 1, sm: 4 }}
                  >
                    <Text
                      fontWeight="medium"
                      color="gray.600"
                      fontSize={{ base: 'sm', md: 'md' }}
                      minW="fit-content"
                    >
                      Rôle:
                    </Text>
                    <Text
                      fontSize={{ base: 'sm', md: 'md' }}
                      textTransform="capitalize"
                    >
                      {user?.municipality_role}
                    </Text>
                  </HStack>

                  <HStack
                    justify="space-between"
                    w="full"
                    flexDirection={{ base: 'column', sm: 'row' }}
                    align={{ base: 'start', sm: 'center' }}
                    gap={{ base: 1, sm: 4 }}
                  >
                    <Text
                      fontWeight="medium"
                      color="gray.600"
                      fontSize={{ base: 'sm', md: 'md' }}
                      minW="fit-content"
                    >
                      Email:
                    </Text>
                    <Text
                      fontSize={{ base: 'sm', md: 'md' }}
                      wordBreak="break-all"
                    >
                      {user?.email}
                    </Text>
                  </HStack>
                </VStack>
              </VStack>
            </Box>

            {/* Quick Actions Card - Optional for future */}
            <Box
              p={cardPadding}
              shadow={{ base: 'sm', md: 'md' }}
              borderWidth="1px"
              borderRadius="lg"
              bg="white"
            >
              <VStack align="start" gap={{ base: 3, md: 4 }}>
                <Text
                  fontSize={{ base: 'md', md: 'lg' }}
                  fontWeight="bold"
                  color="gray.700"
                  mb={2}
                >
                  Actions rapides
                </Text>

                <VStack align="start" gap={2} w="full">
                  <Text
                    fontSize={{ base: 'sm', md: 'md' }}
                    color="gray.600"
                  >
                    • Créer un nouvel article
                  </Text>
                  <Text
                    fontSize={{ base: 'sm', md: 'md' }}
                    color="gray.600"
                  >
                    • Ajouter une page
                  </Text>
                  <Text
                    fontSize={{ base: 'sm', md: 'md' }}
                    color="gray.600"
                  >
                    • Planifier un événement
                  </Text>
                  <Text
                    fontSize={{ base: 'sm', md: 'md' }}
                    color="gray.600"
                  >
                    • Gérer les utilisateurs
                  </Text>
                </VStack>
              </VStack>
            </Box>
          </Grid>
        </Box>
      </VStack>
    </Box>
  )
}
