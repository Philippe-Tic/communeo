import { Box, Grid, Input, Text } from '@chakra-ui/react'

interface FilterOption {
  label: string
  value: string
}

interface FilterField {
  key: string
  label: string
  type: 'text' | 'select'
  placeholder?: string
  options?: FilterOption[]
}

interface FilterPanelProps {
  filters: Record<string, string>
  fields: FilterField[]
  onChange: (key: string, value: string) => void
  columns?: {
    base?: number
    md?: number
    lg?: number
  }
}

export function FilterPanel({
  filters,
  fields,
  onChange,
  columns = { base: 1, md: 2, lg: 4 }
}: FilterPanelProps) {
  const renderField = (field: FilterField) => {
    if (field.type === 'select' && field.options) {
      return (
        <select
          value={filters[field.key] || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '0.375rem',
            border: '1px solid #e2e8f0',
            width: '100%',
            fontSize: '1rem',
            backgroundColor: 'white'
          }}
        >
          <option value="">{field.placeholder || `Tous les ${field.label.toLowerCase()}`}</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    return (
      <Input
        placeholder={field.placeholder || `Rechercher par ${field.label.toLowerCase()}...`}
        value={filters[field.key] || ''}
        onChange={(e) => onChange(field.key, e.target.value)}
      />
    )
  }

  return (
    <Box p={4} borderWidth={1} borderRadius="md" bg="white">
      <Grid
        templateColumns={{
          base: `repeat(${columns.base}, 1fr)`,
          md: `repeat(${columns.md}, 1fr)`,
          lg: `repeat(${columns.lg}, 1fr)`
        }}
        gap={4}
      >
        {fields.map((field) => (
          <Box key={field.key}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              {field.label}
            </Text>
            {renderField(field)}
          </Box>
        ))}
      </Grid>
    </Box>
  )
}
