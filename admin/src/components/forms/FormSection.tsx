import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FormSectionProps {
  title: string
  children: React.ReactNode
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <div className="glass-card overflow-hidden rounded-xl pb-6">
      <div className="h-1 rounded-t-xl bg-gradient-to-r from-indigo-500 to-indigo-400" />
      <CardHeader className="pt-5">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">{children}</div>
      </CardContent>
    </div>
  )
}
