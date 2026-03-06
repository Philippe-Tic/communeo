import { NavigationEditor } from '../../navigation'
import type { NavigationSectionProps } from '../types'

export function NavigationSection({
  navigationItems,
  setNavigationItems,
  setIsDirty,
  pages,
}: NavigationSectionProps) {
  return (
    <div id="section-navigation" className="flex flex-col gap-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Menu principal</h3>
        <NavigationEditor
          items={navigationItems}
          onChange={(items) => {
            setNavigationItems(items)
            setIsDirty(true)
          }}
          pages={pages}
        />
      </div>
    </div>
  )
}
