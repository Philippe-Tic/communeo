import { PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateSiteManagement } from '@/hooks/api/useSiteManagement'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const SiteForm = () => {
  const navigate = useNavigate()
  const createMutation = useCreateSiteManagement()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [error, setError] = useState('')

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !slug.trim()) {
      setError('Le nom et le slug sont requis')
      return
    }

    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        admin_email: adminEmail.trim() || undefined,
        admin_first_name: adminFirstName.trim() || undefined,
        admin_last_name: adminLastName.trim() || undefined,
      })
      navigate(`/super-admin/sites/${result.documentId}`)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Erreur lors de la création')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nouvelle mairie"
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin' },
          { label: 'Mairies', href: '/super-admin/sites' },
          { label: 'Nouvelle' },
        ]}
      />

      <form onSubmit={handleSubmit} className="glass-card max-w-xl space-y-6 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Nom de la mairie <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="ex: Mairie de Lyon"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Slug <span className="text-destructive">*</span>
            </label>
            <Input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true) }}
              placeholder="ex: lyon"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              URL du site : {slug || '...'}-mairie.netlify.app
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Administrateur initial (optionnel)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email admin</label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@mairie.fr"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Un email d'invitation sera envoyé
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Prénom</label>
                <Input
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Nom</label>
                <Input
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="Dupont"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer la mairie
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/super-admin/sites')}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  )
}
