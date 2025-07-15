import { Box, Text } from '@chakra-ui/react'
import { forwardRef } from 'react'

interface SelectOption {
  value: string | number
  label: string
}

interface FormSelectProps {
  label: string
  options: SelectOption[]
  error?: string
  required?: boolean
  placeholder?: string
  // Remove custom onChange, will use standard HTML props
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, options, error, required, placeholder, ...props }, ref) => {
    return (
      <Box>
        <Text fontWeight="medium" mb={2}>
          {label} {required && <Text as="span" color="red.500">*</Text>}
        </Text>
        <select
          ref={ref}
          style={{
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #e2e8f0',
            width: '100%',
            fontSize: '1rem',
            backgroundColor: 'white'
          }}
          {...(props as any)}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <Text color="red.500" fontSize="sm" mt={1}>
            {error}
          </Text>
        )}
      </Box>
    )
  }
)

FormSelect.displayName = 'FormSelect'
