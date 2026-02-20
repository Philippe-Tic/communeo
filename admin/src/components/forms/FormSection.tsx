import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FormSectionProps {
  title: string
  children: React.ReactNode
}

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">{children}</div>
      </CardContent>
    </Card>
  )
}
