import { Box, Spinner, Text, VStack } from '@chakra-ui/react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  minHeight?: string
  centered?: boolean
}

export function LoadingSpinner({
  size = 'lg',
  message = 'Chargement...',
  minHeight = '200px',
  centered = true
}: LoadingSpinnerProps) {
  const content = (
    <VStack gap={4}>
      <Spinner size={size} color="blue.500" />
      {message && (
        <Text color="gray.600" fontSize="sm">
          {message}
        </Text>
      )}
    </VStack>
  )

  if (centered) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH={minHeight}
      >
        {content}
      </Box>
    )
  }

  return content
}
