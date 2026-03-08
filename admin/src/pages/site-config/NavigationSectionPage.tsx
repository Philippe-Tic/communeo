import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { NavigationSection } from '../../components/site-config'
import { buildNavigationPayload } from '../../components/site-config/payloads'
import { useUpdateSite, type NavigationItem } from '../../hooks/api/useSites'
import { usePages } from '../../hooks/api/usePages'
import { toaster } from '../../lib/toaster'
import type { SiteConfigOutletContext } from '../../hooks/useSectionForm'

export function NavigationSectionPage() {
  const { site } = useOutletContext<SiteConfigOutletContext>()
  const { mutate: updateSite, isPending } = useUpdateSite()
  const { data: pagesData } = usePages({ status: 'published', pageSize: 100 })
  const pages = pagesData?.data || []

  const [navigationItems, setNavigationItems] = React.useState<NavigationItem[]>(
    site.navigation_config || []
  )
  const [isDirty, setIsDirty] = React.useState(false)

  React.useEffect(() => {
    setNavigationItems(site.navigation_config || [])
    setIsDirty(false)
  }, [site])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Block save if any section has no children
    const emptySections = navigationItems.filter(i => i.type === 'section' && (!i.children || i.children.length === 0))
    if (emptySections.length > 0) {
      toaster.create({ title: 'Erreur de navigation', description: 'Des sections sont vides. Ajoutez des éléments ou supprimez-les.', type: 'error', duration: 5000 })
      return
    }

    updateSite(
      { documentId: site.documentId, ...buildNavigationPayload(navigationItems) } as any,
      {
        onSuccess: () => {
          toaster.create({ title: 'Navigation mise à jour', type: 'success', duration: 3000 })
          setIsDirty(false)
        },
        onError: () => {
          toaster.create({ title: 'Erreur de sauvegarde', type: 'error', duration: 5000 })
        },
      }
    )
  }

  const handleReset = () => {
    setNavigationItems(site.navigation_config || [])
    setIsDirty(false)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <NavigationSection
        navigationItems={navigationItems} setNavigationItems={setNavigationItems}
        setIsDirty={setIsDirty} pages={pages}
      />
      <div className="flex justify-end gap-4">
        <Button variant="ghost" type="button" onClick={handleReset} disabled={isPending || !isDirty}>Annuler</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Sauvegarde...' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  )
}
