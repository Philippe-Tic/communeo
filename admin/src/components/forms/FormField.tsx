import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { forwardRef } from 'react'

interface FormFieldProps {
  label: string
  placeholder?: string
  error?: string
  required?: boolean
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea'
  rows?: number
}

export const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(
  ({ label, placeholder, error, required, type = 'text', rows = 3, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <Label className="font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {type === 'textarea' ? (
          <Textarea
            placeholder={placeholder}
            rows={rows}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            {...(props as any)}
          />
        ) : (
          <Input
            type={type}
            placeholder={placeholder}
            ref={ref as React.Ref<HTMLInputElement>}
            {...(props as any)}
          />
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    )
  }
)

FormField.displayName = 'FormField'
