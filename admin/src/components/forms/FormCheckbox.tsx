import { Label } from '@/components/ui/label'
import { forwardRef } from 'react'

interface FormCheckboxProps {
  label: string
  error?: string
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            ref={ref}
            className="h-4 w-4 rounded border-input"
            {...(props as any)}
          />
          <Label className="font-medium">{label}</Label>
        </div>
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

FormCheckbox.displayName = 'FormCheckbox'
