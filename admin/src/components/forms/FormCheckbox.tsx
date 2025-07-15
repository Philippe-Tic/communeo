import { Box, HStack, Text } from '@chakra-ui/react'
import { forwardRef } from 'react'

interface FormCheckboxProps {
  label: string
  error?: string
  // Remove custom onChange, will use standard HTML props
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <Box>
        <HStack gap={3} align="center">
          <input
            type="checkbox"
            ref={ref}
            style={{ width: '1rem', height: '1rem' }}
            {...(props as any)}
          />
          <Text fontWeight="medium">{label}</Text>
        </HStack>
        {error && (
          <Text color="red.500" fontSize="sm" mt={1}>
            {error}
          </Text>
        )}
      </Box>
    )
  }
)

FormCheckbox.displayName = 'FormCheckbox'
