import { Input } from '@/components/ui/input'

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
}: FilterPanelProps) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-2 block text-sm font-medium">
              {field.label}
            </label>
            {field.type === 'select' && field.options ? (
              <select
                value={filters[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">{field.placeholder || `Tous les ${field.label.toLowerCase()}`}</option>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder={field.placeholder || `Rechercher par ${field.label.toLowerCase()}...`}
                value={filters[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
