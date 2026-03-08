import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { SectionConfig } from './types'

interface SiteConfigNavProps {
  sections: SectionConfig[]
}

export function SiteConfigNav({ sections }: SiteConfigNavProps) {
  return (
    <nav className="sticky top-[100px] h-fit w-[220px] shrink-0">
      <div className="flex flex-col gap-1">
        {sections.map((section) => (
          <NavLink
            key={section.key}
            to={section.path}
            className={({ isActive }) => cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              isActive
                ? 'bg-gradient-to-r from-brand-800 to-brand-700 font-semibold text-white shadow-sm dark:from-brand-600 dark:to-brand-500'
                : 'text-foreground hover:bg-accent dark:hover:bg-accent/50'
            )}
          >
            <section.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{section.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
