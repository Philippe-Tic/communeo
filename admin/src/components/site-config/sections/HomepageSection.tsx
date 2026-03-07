import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import { ImagePicker } from '../../forms/ImagePicker'
import { RichTextEditor } from '../../editor'
import { QUICK_LINK_ICON_OPTIONS, KEY_FIGURE_ICON_OPTIONS } from '../constants'
import type { QuickLinkIcon, KeyFigureIcon } from '../../../hooks/api/useSites'
import type { HomepageSectionProps } from '../types'

export function HomepageSection({
  formData,
  onFieldChange,
  setIsDirty,
  setFormData,
  heroImage,
  setHeroImage,
  quickLinks,
  setQuickLinks,
  keyFigures,
  setKeyFigures,
  partners,
  setPartners,
}: HomepageSectionProps) {
  return (
    <div id="section-homepage" className="flex flex-col gap-6">
      {/* Hero */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Hero</h2>
          <p className="text-sm text-muted-foreground">
            Bannière principale affichée en haut de la page d'accueil.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label className="mb-2">Titre Hero</Label>
              <Input
                value={formData.hero_title}
                onChange={(e) => onFieldChange('hero_title', e.target.value)}
                placeholder="Bienvenue à..."
                maxLength={120}
              />
            </div>
            <div>
              <Label className="mb-2">Sous-titre</Label>
              <Textarea
                value={formData.hero_subtitle}
                onChange={(e) => onFieldChange('hero_subtitle', e.target.value)}
                placeholder="Au service des habitants..."
                rows={2}
              />
            </div>
          </div>
          <div>
            <Label className="mb-2">Image de fond</Label>
            <ImagePicker
              value={heroImage}
              onChange={(media) => { setHeroImage(media); setIsDirty(true) }}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <Label className="font-medium">Bouton principal (CTA)</Label>
              <Input
                value={formData.hero_cta_primary_label}
                onChange={(e) => onFieldChange('hero_cta_primary_label', e.target.value)}
                placeholder="Libellé (ex: Découvrir)"
                maxLength={50}
              />
              <Input
                value={formData.hero_cta_primary_url}
                onChange={(e) => onFieldChange('hero_cta_primary_url', e.target.value)}
                placeholder="URL (ex: /articles)"
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label className="font-medium">Bouton secondaire (CTA)</Label>
              <Input
                value={formData.hero_cta_secondary_label}
                onChange={(e) => onFieldChange('hero_cta_secondary_label', e.target.value)}
                placeholder="Libellé (ex: Nous contacter)"
                maxLength={50}
              />
              <Input
                value={formData.hero_cta_secondary_url}
                onChange={(e) => onFieldChange('hero_cta_secondary_url', e.target.value)}
                placeholder="URL (ex: /contact)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu éditorial + SEO */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Contenu éditorial</h2>
          <p className="text-sm text-muted-foreground">
            Contenu libre affiché sur la page d'accueil, sous les accès rapides.
          </p>
          <div>
            <Label className="mb-2">Contenu</Label>
            <RichTextEditor
              variant="full"
              value={formData.homepage_content}
              onChange={(value) => onFieldChange('homepage_content', value)}
              placeholder="Bienvenue sur le site de votre commune..."
            />
          </div>
          <div>
            <Label className="mb-2">Meta description SEO</Label>
            <Input
              value={formData.homepage_meta_description}
              onChange={(e) => onFieldChange('homepage_meta_description', e.target.value)}
              placeholder="Description pour les moteurs de recherche (max 160 caractères)"
              maxLength={160}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              {formData.homepage_meta_description.length}/160 caractères
            </p>
          </div>
        </div>
      </div>

      {/* Accès rapides */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Accès rapides</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_quick_links}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_quick_links: !prev.show_quick_links }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_quick_links ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_quick_links ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          {formData.show_quick_links && (
            <>
              <p className="text-sm text-muted-foreground">
                Liens rapides affichés sous le hero. Si aucun n'est configuré, des liens par défaut seront utilisés.
              </p>
              {quickLinks.map((link, index) => (
                <div key={index} className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                  <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
                    <Input
                      value={link.label}
                      onChange={(e) => {
                        const updated = [...quickLinks]
                        updated[index] = { ...updated[index], label: e.target.value }
                        setQuickLinks(updated)
                        setIsDirty(true)
                      }}
                      placeholder="Libellé"
                      maxLength={50}
                    />
                    <Input
                      value={link.url}
                      onChange={(e) => {
                        const updated = [...quickLinks]
                        updated[index] = { ...updated[index], url: e.target.value }
                        setQuickLinks(updated)
                        setIsDirty(true)
                      }}
                      placeholder="URL (ex: /demarches)"
                    />
                    <Select
                      value={link.icon || 'document'}
                      onValueChange={(v) => {
                        const updated = [...quickLinks]
                        updated[index] = { ...updated[index], icon: v as QuickLinkIcon }
                        setQuickLinks(updated)
                        setIsDirty(true)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUICK_LINK_ICON_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={link.description || ''}
                      onChange={(e) => {
                        const updated = [...quickLinks]
                        updated[index] = { ...updated[index], description: e.target.value }
                        setQuickLinks(updated)
                        setIsDirty(true)
                      }}
                      placeholder="Description (optionnel)"
                      maxLength={100}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuickLinks(quickLinks.filter((_, i) => i !== index))
                      setIsDirty(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuickLinks([...quickLinks, { label: '', url: '', icon: 'document' }])
                  setIsDirty(true)
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ajouter un lien rapide
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mot du maire */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Mot du Maire</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_mayor_word}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_mayor_word: !prev.show_mayor_word }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_mayor_word ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_mayor_word ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          {formData.show_mayor_word && (
            <>
              <p className="text-sm text-muted-foreground">
                La photo du maire est automatiquement récupérée depuis les membres de l'équipe (rôle "Maire").
              </p>
              <div>
                <Label className="mb-2">Titre de la section</Label>
                <Input
                  value={formData.mayor_word_title}
                  onChange={(e) => onFieldChange('mayor_word_title', e.target.value)}
                  placeholder="Le mot du Maire"
                  maxLength={120}
                />
              </div>
              <div>
                <Label className="mb-2">Contenu</Label>
                <RichTextEditor
                  value={formData.mayor_word_content}
                  onChange={(value) => onFieldChange('mayor_word_content', value)}
                  placeholder="Chères concitoyennes, chers concitoyens..."
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actualités */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Actualités</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_articles}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_articles: !prev.show_articles }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_articles ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_articles ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          {formData.show_articles && (
            <div>
              <Label className="mb-2">Nombre d'articles affichés</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={formData.articles_count}
                onChange={(e) => onFieldChange('articles_count', e.target.value)}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Articles mis en avant affichés sur la page d'accueil (1 à 6)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Événements */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Événements</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_events}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_events: !prev.show_events }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_events ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_events ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          {formData.show_events && (
            <div>
              <Label className="mb-2">Nombre d'événements affichés</Label>
              <Input
                type="number"
                min={1}
                max={6}
                value={formData.events_count}
                onChange={(e) => onFieldChange('events_count', e.target.value)}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Prochains événements affichés sur la page d'accueil (1 à 6)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chiffres clés */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Chiffres clés</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_key_figures}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_key_figures: !prev.show_key_figures }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_key_figures ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_key_figures ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          {formData.show_key_figures && (
            <>
              {keyFigures.map((figure, index) => (
                <div key={index} className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                  <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
                    <Input
                      value={figure.value}
                      onChange={(e) => {
                        const updated = [...keyFigures]
                        updated[index] = { ...updated[index], value: e.target.value }
                        setKeyFigures(updated)
                        setIsDirty(true)
                      }}
                      placeholder="Valeur (ex: 12 500)"
                      maxLength={20}
                    />
                    <Input
                      value={figure.label}
                      onChange={(e) => {
                        const updated = [...keyFigures]
                        updated[index] = { ...updated[index], label: e.target.value }
                        setKeyFigures(updated)
                        setIsDirty(true)
                      }}
                      placeholder="Label (ex: Habitants)"
                      maxLength={60}
                    />
                    <Select
                      value={figure.icon || 'users'}
                      onValueChange={(v) => {
                        const updated = [...keyFigures]
                        updated[index] = { ...updated[index], icon: v as KeyFigureIcon }
                        setKeyFigures(updated)
                        setIsDirty(true)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KEY_FIGURE_ICON_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setKeyFigures(keyFigures.filter((_, i) => i !== index))
                      setIsDirty(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setKeyFigures([...keyFigures, { value: '', label: '', icon: 'users' }])
                  setIsDirty(true)
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ajouter un chiffre clé
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Associations */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Associations</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_associations}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_associations: !prev.show_associations }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_associations ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_associations ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          {formData.show_associations && (
            <div>
              <Label className="mb-2">Nombre d'associations affichées</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={formData.associations_count}
                onChange={(e) => onFieldChange('associations_count', e.target.value)}
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Associations publiées affichées sur la page d'accueil (1 à 12)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Partenaires */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Partenaires</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_partners}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_partners: !prev.show_partners }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_partners ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_partners ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          {formData.show_partners && (
            <>
              {partners.map((partner, index) => (
                <div key={index} className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
                  <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
                    <Input
                      value={partner.name}
                      onChange={(e) => {
                        const updated = [...partners]
                        updated[index] = { ...updated[index], name: e.target.value }
                        setPartners(updated)
                        setIsDirty(true)
                      }}
                      placeholder="Nom du partenaire"
                      maxLength={100}
                    />
                    <Input
                      value={partner.url || ''}
                      onChange={(e) => {
                        const updated = [...partners]
                        updated[index] = { ...updated[index], url: e.target.value }
                        setPartners(updated)
                        setIsDirty(true)
                      }}
                      placeholder="URL du site web"
                    />
                    <ImagePicker
                      value={partner.logo || null}
                      onChange={(media) => {
                        const updated = [...partners]
                        updated[index] = { ...updated[index], logo: media }
                        setPartners(updated)
                        setIsDirty(true)
                      }}
                      className="h-24"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPartners(partners.filter((_, i) => i !== index))
                      setIsDirty(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPartners([...partners, { name: '', url: '' }])
                  setIsDirty(true)
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Ajouter un partenaire
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Météo locale */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Météo locale</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_weather}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_weather: !prev.show_weather }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_weather ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_weather ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Affiche un widget météo en temps réel sur la page d'accueil (données Open-Meteo).
          </p>
          {formData.show_weather && (!formData.latitude || !formData.longitude) && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Les coordonnées GPS (latitude/longitude) doivent être renseignées dans la section "Infos pratiques" pour que le widget météo s'affiche.
            </p>
          )}
        </div>
      </div>
      {/* Collecte des dechets */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Collecte des dechets</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_waste_collection}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_waste_collection: !prev.show_waste_collection }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_waste_collection ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_waste_collection ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Affiche les prochaines collectes de dechets sur la page d'accueil.
          </p>
        </div>
      </div>
      {/* Perturbations en cours */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Perturbations en cours</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_disruptions}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_disruptions: !prev.show_disruptions }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_disruptions ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_disruptions ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Affiche les perturbations en cours (travaux, coupures, deviations) sur la page d'accueil.
          </p>
        </div>
      </div>
      {/* Newsletter */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Newsletter</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_newsletter}
                onClick={() => {
                  setFormData(prev => ({ ...prev, show_newsletter: !prev.show_newsletter }))
                  setIsDirty(true)
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  formData.show_newsletter ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition-transform ${formData.show_newsletter ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <Label>Afficher</Label>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Affiche un formulaire d'inscription à la newsletter sur la page d'accueil et dans le pied de page.
          </p>
        </div>
      </div>
    </div>
  )
}
