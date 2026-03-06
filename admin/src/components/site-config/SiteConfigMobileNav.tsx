import { AlertCircle } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { SectionConfig } from './types'

interface SiteConfigMobileNavProps {
  sections: SectionConfig[]
  sectionHasErrors?: (key: string) => boolean
  renderSection: (key: string) => React.ReactNode
}

export function SiteConfigMobileNav({
  sections,
  sectionHasErrors,
  renderSection,
}: SiteConfigMobileNavProps) {
  return (
    <Accordion type="single" collapsible defaultValue="general" className="flex flex-col gap-2">
      {sections.map((section) => {
        const hasErrors = sectionHasErrors?.(section.key)
        return (
          <AccordionItem key={section.key} value={section.key} className="rounded-lg border bg-card shadow-sm">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2.5">
                <section.icon className="h-4 w-4 shrink-0" />
                <span>{section.label}</span>
                {hasErrors && (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent forceMount className="data-[state=closed]:hidden">
              <div className="px-4 pb-2">
                {renderSection(section.key)}
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
