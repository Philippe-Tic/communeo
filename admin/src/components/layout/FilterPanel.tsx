import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    <div className="glass-card rounded-xl p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-2 block text-sm font-medium">
              {field.label}
            </label>
            {field.type === 'select' && field.options ? (
              <Select
                value={filters[field.key] || 'all'}
                onValueChange={(value) => onChange(field.key, value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={field.placeholder || `Tous les ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{field.placeholder || `Tous les ${field.label.toLowerCase()}`}</SelectItem>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
