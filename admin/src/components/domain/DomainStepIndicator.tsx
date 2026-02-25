import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

type Step = 'configure' | 'dns' | 'active'

interface DomainStepIndicatorProps {
  currentStep: Step
}

const steps: { key: Step; label: string }[] = [
  { key: 'configure', label: 'Saisie du domaine' },
  { key: 'dns', label: 'Pointage DNS' },
  { key: 'active', label: 'Domaine actif' },
]

export function DomainStepIndicator({ currentStep }: DomainStepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep)

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <div key={step.key} className="flex items-center gap-2">
            {index > 0 && (
              <div className={`h-px w-6 ${isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
            )}
            <div className="flex items-center gap-1.5">
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                  isCurrent
                    ? 'bg-indigo-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
              )}
              <Badge
                variant="secondary"
                className={
                  isCompleted
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : isCurrent
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                      : ''
                }
              >
                {step.label}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
