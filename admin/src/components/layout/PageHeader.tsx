import { Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'

interface PageHeaderAction {
  label: string
  onClick: () => void
  variant?: 'solid' | 'outline' | 'ghost'
  colorScheme?: string
  loading?: boolean
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: PageHeaderAction[]
}

export function PageHeader({ title, subtitle, actions = [] }: PageHeaderProps) {
  return (
    <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
      <VStack align="start" gap={1}>
        <Heading size="lg">{title}</Heading>
        {subtitle && (
          <Text color="gray.600" fontSize="md">
            {subtitle}
          </Text>
        )}
      </VStack>

      {actions.length > 0 && (
        <HStack gap={3} flexWrap="wrap">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'solid'}
              colorScheme={action.colorScheme || 'blue'}
              onClick={action.onClick}
              loading={action.loading}
              size={{ base: 'md', md: 'lg' }}
            >
              {action.label}
            </Button>
          ))}
        </HStack>
      )}
    </HStack>
  )
}
