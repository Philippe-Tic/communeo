import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/layout'
import {
  useAlerte,
  useCreateAlerte,
  useUpdateAlerte,
  type AlerteSeverity,
  type CreateAlerteData,
} from '../hooks/api/useAlertes'
import { toaster } from '../lib/toaster'

export const AlerteForm = () => {
  const navigate = useNavigate()
  const { id: documentId } = useParams<{ id: string }>()
  const isEdit = !!documentId

  const { data: alerte } = useAlerte(documentId || '')
  const createMutation = useCreateAlerte()
  const updateMutation = useUpdateAlerte()

  const [form, setForm] = useState<CreateAlerteData>({
    title: '',
    message: '',
    severity: 'info',
    active: false,
    display_from: '',
    display_until: '',
    link_url: '',
    link_label: '',
  })

  useEffect(() => {
    if (alerte) {
      setForm({
        title: alerte.title,
        message: alerte.message,
        severity: alerte.severity,
        active: alerte.active,
        display_from: alerte.display_from ? alerte.display_from.slice(0, 16) : '',
        display_until: alerte.display_until ? alerte.display_until.slice(0, 16) : '',
        link_url: alerte.link_url || '',
        link_label: alerte.link_label || '',
      })
    }
  }, [alerte])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: CreateAlerteData = {
      ...form,
      display_from: form.display_from || undefined,
      display_until: form.display_until || undefined,
      link_url: form.link_url || undefined,
      link_label: form.link_label || undefined,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: documentId!, ...data })
        toaster.create({
          title: 'Alerte modifiée',
          type: 'success',
          duration: 3000,
        })
      } else {
        await createMutation.mutateAsync(data)
        toaster.create({
          title: 'Alerte créée',
          type: 'success',
          duration: 3000,
        })
      }
      navigate('/alertes')
    } catch {
      toaster.create({
        title: 'Erreur',
        description: 'Une erreur est survenue.',
        type: 'error',
        duration: 5000,
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex flex-col gap-6">
        <PageHeader
          title={isEdit ? 'Modifier l\'alerte' : 'Nouvelle alerte'}
          subtitle="Les alertes s'affichent comme un bandeau en haut du site public"
        />

        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Alerte météo - Vigilance orange"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Décrivez l'alerte en quelques phrases..."
              required
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="severity">Niveau de gravité</Label>
              <Select
                value={form.severity}
                onValueChange={(value) => setForm(prev => ({ ...prev, severity: value as AlerteSeverity }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-3 pb-1">
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">Alerte active (visible sur le site)</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="display_from">Afficher à partir de</Label>
              <Input
                id="display_from"
                type="datetime-local"
                value={form.display_from}
                onChange={(e) => setForm(prev => ({ ...prev, display_from: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_until">Afficher jusqu'à</Label>
              <Input
                id="display_until"
                type="datetime-local"
                value={form.display_until}
                onChange={(e) => setForm(prev => ({ ...prev, display_until: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="link_url">Lien (optionnel)</Label>
              <Input
                id="link_url"
                type="url"
                value={form.link_url}
                onChange={(e) => setForm(prev => ({ ...prev, link_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link_label">Texte du lien</Label>
              <Input
                id="link_label"
                value={form.link_label}
                onChange={(e) => setForm(prev => ({ ...prev, link_label: e.target.value }))}
                placeholder="En savoir plus"
                maxLength={100}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/alertes')}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
