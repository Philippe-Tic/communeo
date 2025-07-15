import { Box, Button, Text, VStack } from '@chakra-ui/react'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <Box p={8} textAlign="center">
      <VStack gap={4}>
        {icon && (
          <Box fontSize="4xl" color="gray.400">
            {icon}
          </Box>
        )}
        <Text fontSize="lg" fontWeight="medium" color="gray.600">
          {title}
        </Text>
        {description && (
          <Text color="gray.500" maxW="md">
            {description}
          </Text>
        )}
        {actionLabel && onAction && (
          <Button colorScheme="blue" onClick={onAction} mt={2}>
            {actionLabel}
          </Button>
        )}
      </VStack>
    </Box>
  )
}
