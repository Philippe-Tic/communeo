import { Box, Button, Text, VStack } from '@chakra-ui/react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Impossible de charger les données. Veuillez réessayer.',
  onRetry,
  retryLabel = 'Réessayer'
}: ErrorStateProps) {
  return (
    <Box p={8} textAlign="center">
      <VStack gap={4}>
        <Box fontSize="4xl">❌</Box>
        <Text fontSize="lg" fontWeight="medium" color="red.600">
          {title}
        </Text>
        <Text color="gray.600" maxW="md">
          {message}
        </Text>
        {onRetry && (
          <Button colorScheme="red" variant="outline" onClick={onRetry} mt={2}>
            {retryLabel}
          </Button>
        )}
      </VStack>
    </Box>
  )
}
