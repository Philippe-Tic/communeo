import { Box, Text, VStack } from '@chakra-ui/react'

interface StatsCardProps {
  label: string
  value: string | number
  color: string
  icon?: React.ReactNode
}

export function StatsCard({ label, value, color, icon }: StatsCardProps) {
  return (
    <Box
      p={6}
      bg="white"
      borderRadius="lg"
      boxShadow="sm"
      borderWidth={1}
      borderColor="gray.200"
      _hover={{ boxShadow: 'md' }}
      transition="all 0.2s"
    >
      <VStack gap={3} align="start">
        {icon && (
          <Box fontSize="2xl" color={`${color}.500`}>
            {icon}
          </Box>
        )}

        <VStack gap={1} align="start">
          <Text
            fontSize="3xl"
            fontWeight="bold"
            color={`${color}.600`}
            lineHeight={1}
          >
            {value}
          </Text>
          <Text
            fontSize="sm"
            color="gray.600"
            fontWeight="medium"
          >
            {label}
          </Text>
        </VStack>
      </VStack>
    </Box>
  )
}
