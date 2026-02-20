import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface FormCheckboxProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
  description?: string
}

export function FormCheckbox({
  label,
  checked,
  onCheckedChange,
  error,
  description,
}: FormCheckboxProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
        <div>
          <Label className="cursor-pointer font-medium">{label}</Label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
