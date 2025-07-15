import {
    Box,
    Button,
    HStack,
    IconButton,
    Stack,
    Text,
    VStack
} from '@chakra-ui/react'
import { useState } from 'react'
import type { Page } from '../../hooks/api/usePages'
import { DeleteIcon, EditIcon, EyeIcon, MoreIcon } from '../../utils/icons'
import { StatusBadge } from '../common'

interface PageCardProps {
  page: Page
  onEdit: (page: Page) => void
  onView: (page: Page) => void
  onDelete: (page: Page) => void
}

export function PageCard({ page, onEdit, onView, onDelete }: PageCardProps) {
  const [showActions, setShowActions] = useState(false)

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <Box
      borderWidth={1}
      borderRadius="md"
      p={4}
      bg="white"
      boxShadow="sm"
      _hover={{ boxShadow: 'md' }}
      transition="all 0.2s"
      position="relative"
    >
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1} flex={1}>
            <Text fontWeight="bold" fontSize="lg" lineHeight="1.2">
              {truncateText(page.title, 50)}
            </Text>
            <Text color="gray.600" fontSize="sm">
              /{page.slug}
            </Text>
          </VStack>

          <Box position="relative">
            <IconButton
              aria-label="More actions"
              size="sm"
              variant="ghost"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreIcon />
            </IconButton>

            {showActions && (
              <Box
                position="absolute"
                top="100%"
                right={0}
                mt={1}
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                borderRadius="md"
                shadow="lg"
                p={2}
                zIndex={10}
                minW="200px"
              >
                <Stack gap={1}>
                  <Button
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      onEdit(page)
                      setShowActions(false)
                    }}
                  >
                    <HStack gap={2}>
                      <EditIcon />
                      <Text>Modifier</Text>
                    </HStack>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      onView(page)
                      setShowActions(false)
                    }}
                  >
                    <HStack gap={2}>
                      <EyeIcon />
                      <Text>Voir</Text>
                    </HStack>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    justifyContent="flex-start"
                    colorScheme="red"
                    onClick={() => {
                      onDelete(page)
                      setShowActions(false)
                    }}
                  >
                    <HStack gap={2}>
                      <DeleteIcon />
                      <Text>Supprimer</Text>
                    </HStack>
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </HStack>

        <Box>
          <Text color="gray.700" fontSize="sm">
            {truncateText(page.content.replace(/<[^>]*>/g, '') || 'Aucun contenu', 100)}
          </Text>
        </Box>

        <HStack justify="space-between" align="center">
          <StatusBadge status={page.status} />
          {page.is_homepage && (
            <Text fontSize="xs" color="blue.600" fontWeight="medium">
              Page d'accueil
            </Text>
          )}
        </HStack>

        <HStack justify="space-between" align="center">
          <Text fontSize="xs" color="gray.500">
            Modifié: {new Date(page.updatedAt).toLocaleDateString('fr-FR')}
          </Text>
          <Text fontSize="xs" color="gray.500">
            Ordre: {page.menu_order}
          </Text>
        </HStack>
      </VStack>
    </Box>
  )
}
