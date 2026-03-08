import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { SocialSection } from '../../components/site-config'
import { buildSocialPayload } from '../../components/site-config/payloads'
import { useUpdateSite, type SocialLink } from '../../hooks/api/useSites'
import { toaster } from '../../lib/toaster'
import type { SiteConfigOutletContext } from '../../hooks/useSectionForm'

export function SocialSectionPage() {
  const { site } = useOutletContext<SiteConfigOutletContext>()
  const { mutate: updateSite, isPending } = useUpdateSite()

  const [socialLinks, setSocialLinks] = React.useState<SocialLink[]>(
    site.social_links?.map(({ id: _id, ...rest }) => rest) || []
  )
  const [isDirty, setIsDirty] = React.useState(false)

  React.useEffect(() => {
    setSocialLinks(site.social_links?.map(({ id: _id, ...rest }) => rest) || [])
    setIsDirty(false)
  }, [site])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateSite(
      { documentId: site.documentId, ...buildSocialPayload(socialLinks) } as any,
      {
        onSuccess: () => {
          toaster.create({ title: 'Réseaux sociaux mis à jour', type: 'success', duration: 3000 })
          setIsDirty(false)
        },
        onError: () => {
          toaster.create({ title: 'Erreur de sauvegarde', type: 'error', duration: 5000 })
        },
      }
    )
  }

  const handleReset = () => {
    setSocialLinks(site.social_links?.map(({ id: _id, ...rest }) => rest) || [])
    setIsDirty(false)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <SocialSection socialLinks={socialLinks} setSocialLinks={setSocialLinks} setIsDirty={setIsDirty} />
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
