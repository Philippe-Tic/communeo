import { Label } from '@/components/ui/label'
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
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, options, error, required, placeholder, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <Label className="font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <select
          ref={ref}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          {...(props as any)}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

FormSelect.displayName = 'FormSelect'
