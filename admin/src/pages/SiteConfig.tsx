import {
  Badge,
  Box,
  Heading,
  Image,
  SimpleGrid,
  Text,
  VStack
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { useSite } from '../hooks/api/useSites'
import { useCanManageSite, useUserSite } from '../hooks/useUser'

export const SiteConfig = () => {
  const { site: userSite } = useUserSite()
  const { canEditConfig, hasSite } = useCanManageSite()
  const { data: site, isLoading, error } = useSite(userSite?.documentId || '')
  const navigate = useNavigate()

  if (!hasSite) {
    return <ErrorState title="Site non trouvé" message="Aucun site associé à votre compte" />
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState title="Erreur de chargement" message="Impossible de charger la configuration du site" />
  if (!site) return <ErrorState title="Site non trouvé" message="Aucune configuration de site disponible" />

  return (
    <Box maxW="full" mx="auto">
      <VStack gap={6} align="stretch">
        <PageHeader
          title="Configuration du site"
          subtitle="Paramètres et informations du site"
          actions={canEditConfig ? [
            {
              label: "Modifier",
              onClick: () => navigate('/site/edit'),
              colorScheme: "blue"
            }
          ] : []}
        />

        {!canEditConfig && (
          <Box bg="orange.50" p={4} borderRadius="md" borderWidth={1} borderColor="orange.200">
            <Text color="orange.800" fontSize="sm">
              <strong>Information :</strong> Vous pouvez consulter la configuration mais seuls les maires et adjoints peuvent la modifier.
            </Text>
          </Box>
        )}

        {/* Informations générales */}
        <Box bg="white" p={6} borderRadius="lg" shadow="sm" borderWidth={1}>
          <VStack gap={4} align="stretch">
            <Heading size="md" color="gray.700">
              Informations générales
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
              <VStack align="start" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Nom du site
                </Text>
                <Text fontSize="lg" fontWeight="semibold">
                  {site.name}
                </Text>
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Slug
                </Text>
                <Text fontSize="lg">
                  {site.slug}
                </Text>
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Thème
                </Text>
                <Badge
                  colorScheme={
                    site.theme === 'moderne' ? 'blue' :
                    site.theme === 'accessible' ? 'green' : 'gray'
                  }
                  size="lg"
                  textTransform="capitalize"
                >
                  {site.theme}
                </Badge>
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Email de contact
                </Text>
                <Text fontSize="lg">
                  {site.contact_mail}
                </Text>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Box>

        {/* Contact et adresse */}
        <Box bg="white" p={6} borderRadius="lg" shadow="sm" borderWidth={1}>
          <VStack gap={4} align="stretch">
            <Heading size="md" color="gray.700">
              Informations de contact
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
              {site.contact_phone && (
                <VStack align="start" gap={2}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600">
                    Téléphone
                  </Text>
                  <Text fontSize="lg">
                    {site.contact_phone}
                  </Text>
                </VStack>
              )}

              {site.address && (
                <VStack align="start" gap={2}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.600">
                    Adresse
                  </Text>
                  <Text fontSize="lg" whiteSpace="pre-line">
                    {site.address}
                  </Text>
                </VStack>
              )}
            </SimpleGrid>

            {(!site.contact_phone && !site.address) && (
              <Text color="gray.500" fontStyle="italic">
                Aucune information de contact additionnelle configurée
              </Text>
            )}
          </VStack>
        </Box>

        {/* Logo */}
        {site.logo && (
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" borderWidth={1}>
            <VStack gap={4} align="stretch">
              <Heading size="md" color="gray.700">
                Logo du site
              </Heading>

              <Box>
                <Image
                  src={site.logo.url}
                  alt={site.logo.alternativeText || `Logo de ${site.name}`}
                  maxH="200px"
                  objectFit="contain"
                  borderRadius="md"
                />
              </Box>
            </VStack>
          </Box>
        )}

        {/* Couleurs du thème */}
        {site.colors && (
          <Box bg="white" p={6} borderRadius="lg" shadow="sm" borderWidth={1}>
            <VStack gap={4} align="stretch">
              <Heading size="md" color="gray.700">
                Configuration des couleurs
              </Heading>

              <Box>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  Paramètres JSON des couleurs du thème
                </Text>
                <Box
                  bg="gray.50"
                  p={4}
                  borderRadius="md"
                  fontFamily="mono"
                  fontSize="sm"
                  whiteSpace="pre-wrap"
                  overflowX="auto"
                >
                  {JSON.stringify(site.colors, null, 2)}
                </Box>
              </Box>
            </VStack>
          </Box>
        )}

        {/* Informations système */}
        <Box bg="white" p={6} borderRadius="lg" shadow="sm" borderWidth={1}>
          <VStack gap={4} align="stretch">
            <Heading size="md" color="gray.700">
              Informations système
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              <VStack align="start" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Créé le
                </Text>
                <Text fontSize="lg">
                  {new Date(site.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Modifié le
                </Text>
                <Text fontSize="lg">
                  {new Date(site.updatedAt).toLocaleDateString('fr-FR')}
                </Text>
              </VStack>

              <VStack align="start" gap={2}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  ID du site
                </Text>
                <Text fontSize="lg" fontFamily="mono">
                  {site.documentId}
                </Text>
              </VStack>
            </SimpleGrid>
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}
