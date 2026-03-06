import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { ImagePicker } from '../../forms/ImagePicker'
import { SOCIAL_PLATFORM_OPTIONS } from '../constants'
import type { SocialPlatform } from '../../../hooks/api/useSites'
import type { SocialSectionProps } from '../types'

export function SocialSection({
  socialLinks,
  setSocialLinks,
  setIsDirty,
}: SocialSectionProps) {
  return (
    <div id="section-social" className="flex flex-col gap-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Réseaux sociaux</h2>
              <p className="text-sm text-muted-foreground">Liens vers vos réseaux sociaux affichés dans le pied de page du site</p>
            </div>
            {socialLinks.length < 8 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSocialLinks(prev => [...prev, { platform: 'facebook', url: '' }])
                  setIsDirty(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            )}
          </div>

          {socialLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              Aucun réseau social configuré. Cliquez sur "Ajouter" pour commencer.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {socialLinks.map((link, index) => (
                <div key={index} className="rounded-md border p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 flex-1">
                      <div>
                        <Label className="mb-2">Plateforme</Label>
                        <Select
                          value={link.platform}
                          onValueChange={(value: SocialPlatform) => {
                            setSocialLinks(prev => prev.map((l, i) =>
                              i === index ? { ...l, platform: value, ...(value !== 'autre' ? { label: undefined, icon: null } : {}) } : l
                            ))
                            setIsDirty(true)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SOCIAL_PLATFORM_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-2">URL <span className="text-destructive">*</span></Label>
                        <Input
                          value={link.url}
                          onChange={(e) => {
                            setSocialLinks(prev => prev.map((l, i) =>
                              i === index ? { ...l, url: e.target.value } : l
                            ))
                            setIsDirty(true)
                          }}
                          placeholder="https://..."
                        />
                        {link.url && !link.url.startsWith('https://') && (
                          <p className="text-xs text-destructive mt-1">L'URL doit commencer par https://</p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive mt-6"
                      onClick={() => {
                        setSocialLinks(prev => prev.filter((_, i) => i !== index))
                        setIsDirty(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {link.platform === 'autre' && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label className="mb-2">Label <span className="text-destructive">*</span></Label>
                        <Input
                          value={link.label || ''}
                          onChange={(e) => {
                            setSocialLinks(prev => prev.map((l, i) =>
                              i === index ? { ...l, label: e.target.value } : l
                            ))
                            setIsDirty(true)
                          }}
                          placeholder="Nom du réseau"
                          maxLength={50}
                        />
                        {link.platform === 'autre' && !link.label?.trim() && (
                          <p className="text-xs text-destructive mt-1">Le label est requis pour une plateforme personnalisée</p>
                        )}
                      </div>
                      <div>
                        <Label className="mb-2">Icône personnalisée</Label>
                        <ImagePicker
                          value={link.icon || null}
                          onChange={(img) => {
                            setSocialLinks(prev => prev.map((l, i) =>
                              i === index ? { ...l, icon: img } : l
                            ))
                            setIsDirty(true)
                          }}
                          label="Icône"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
