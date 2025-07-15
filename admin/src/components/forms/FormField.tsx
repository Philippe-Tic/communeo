import { Box, Input, Text, Textarea } from '@chakra-ui/react'
import { forwardRef } from 'react'

interface FormFieldProps {
  label: string
  placeholder?: string
  error?: string
  required?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea'
  rows?: number
  // Remove custom onChange, will use standard HTML props
}

export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  ({ label, placeholder, error, required, type = 'text', rows = 3, ...props }, ref) => {
    const renderInput = () => {
      if (type === 'textarea') {
        return (
          <Textarea
            placeholder={placeholder}
            rows={rows}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            {...(props as any)}
          />
        )
      }

      return (
        <Input
          type={type}
          placeholder={placeholder}
          ref={ref as React.Ref<HTMLInputElement>}
          {...(props as any)}
        />
      )
    }

    return (
      <Box>
        <Text fontWeight="medium" mb={2}>
          {label} {required && <Text as="span" color="red.500">*</Text>}
        </Text>
        {renderInput()}
        {error && (
          <Text color="red.500" fontSize="sm" mt={1}>
            {error}
          </Text>
        )}
      </Box>
    )
  }
)

FormField.displayName = 'FormField'
