interface FormSectionProps {
  title: string
  children: React.ReactNode
  gap?: number
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
