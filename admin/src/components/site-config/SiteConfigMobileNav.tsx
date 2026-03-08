import { useLocation, useNavigate } from 'react-router-dom'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SectionConfig } from './types'

interface SiteConfigMobileNavProps {
  sections: SectionConfig[]
}

export function SiteConfigMobileNav({ sections }: SiteConfigMobileNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const currentKey = location.pathname.split('/').pop() || 'general'
  const currentSection = sections.find(s => s.key === currentKey)

  return (
    <Select value={currentKey} onValueChange={(value) => navigate(`/site/${value}`)}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          {currentSection && <currentSection.icon className="h-4 w-4" />}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {sections.map((section) => (
          <SelectItem key={section.key} value={section.key}>
            <div className="flex items-center gap-2">
              <section.icon className="h-4 w-4" />
              <span>{section.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
