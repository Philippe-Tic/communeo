import { Badge } from '@/components/ui/badge'
import { getMediaUrl } from '@/lib/utils'
import type { Site } from '../../hooks/api/useSites'

interface SiteConfigReadOnlyProps {
  site: Site
}

export function SiteConfigReadOnly({ site }: SiteConfigReadOnlyProps) {
  return (
    <>
      {/* section-general */}
      <div id="section-general" className="flex flex-col gap-6">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Informations générales</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ReadOnlyField label="Nom du site" value={site.name} bold />
              <ReadOnlyField label="Slug" value={site.slug} />
              <ReadOnlyField label="Email de contact" value={site.contact_mail} />
              {site.contact_phone && <ReadOnlyField label="Téléphone" value={site.contact_phone} />}
              {site.address && <ReadOnlyField label="Adresse" value={site.address} whitespace />}
            </div>
          </div>
        </div>

        {site.logo && (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">Identité visuelle</h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Logo</p>
                  <img
                    src={getMediaUrl(site.logo.url)}
                    alt={site.logo.alternativeText || `Logo de ${site.name}`}
                    className="max-h-[200px] rounded-md object-contain"
                  />
                </div>
                {site.favicon && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Favicon</p>
                    <img
                      src={getMediaUrl(site.favicon.url)}
                      alt="Favicon"
                      className="max-h-[64px] rounded-md object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {site.colors && (
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">Configuration des couleurs</h2>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
                {JSON.stringify(site.colors, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Déploiement automatique</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">Statut</p>
                <Badge variant={site.auto_deploy_enabled ? 'default' : 'secondary'}>
                  {site.auto_deploy_enabled ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              {site.auto_deploy_enabled && (
                <ReadOnlyField label="Délai" value={`${site.auto_deploy_delay || 300} secondes`} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* section-legal */}
      <div id="section-legal">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Mentions légales</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ReadOnlyField label="SIRET" value={site.mentions_legales?.siret} />
              <ReadOnlyField label="Directeur de publication" value={site.mentions_legales?.publication_director} />
              {site.mentions_legales?.publication_director_title && (
                <ReadOnlyField label="Titre" value={site.mentions_legales.publication_director_title} />
              )}
              <ReadOnlyField label="Hébergeur" value={site.mentions_legales?.hebergeur_name} />
              {site.mentions_legales?.hebergeur_address && (
                <ReadOnlyField label="Adresse hébergeur" value={site.mentions_legales.hebergeur_address} />
              )}
            </div>
            {site.mentions_legales?.credits && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Crédits</p>
                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: site.mentions_legales.credits }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* section-rgpd */}
      <div id="section-rgpd">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">RGPD & Confidentialité</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ReadOnlyField label="Nom du DPO" value={site.rgpd?.dpo_name} />
              <ReadOnlyField label="Email du DPO" value={site.rgpd?.dpo_email} />
              {site.rgpd?.dpo_phone && <ReadOnlyField label="Téléphone du DPO" value={site.rgpd.dpo_phone} />}
            </div>
            {site.rgpd?.rgpd_policy && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Politique de confidentialité</p>
                <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-muted/30 p-4" dangerouslySetInnerHTML={{ __html: site.rgpd.rgpd_policy }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* section-accessibility */}
      <div id="section-accessibility">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Accessibilité</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">Niveau de conformité</p>
                <Badge variant={site.accessibilite?.accessibility_level === 'conforme' ? 'default' : 'secondary'}>
                  {site.accessibilite?.accessibility_level || 'Non renseigné'}
                </Badge>
              </div>
              {site.accessibilite?.accessibility_schema_url && (
                <ReadOnlyField label="Schéma pluriannuel" value={site.accessibilite.accessibility_schema_url} />
              )}
              {site.accessibilite?.accessibility_action_plan_url && (
                <ReadOnlyField label="Plan d'action" value={site.accessibilite.accessibility_action_plan_url} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* section-info */}
      <div id="section-info">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Informations pratiques</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {site.infos_pratiques?.population && (
                <ReadOnlyField label="Population" value={site.infos_pratiques.population.toString()} />
              )}
              {site.infos_pratiques?.contact_form_intro && (
                <ReadOnlyField label="Intro formulaire contact" value={site.infos_pratiques.contact_form_intro} />
              )}
            </div>
            {site.infos_pratiques?.opening_hours && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Horaires d'ouverture</p>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
                  {JSON.stringify(site.infos_pratiques.opening_hours, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* section-opendata */}
      <div id="section-opendata">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Open Data</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">Statut</p>
                <Badge variant={site.open_data_enabled ? 'default' : 'secondary'}>
                  {site.open_data_enabled ? 'Activé' : 'Désactivé'}
                </Badge>
              </div>
              {site.open_data_enabled && site.open_data_platform && site.open_data_platform !== 'none' && (
                <ReadOnlyField label="Plateforme" value={site.open_data_platform} />
              )}
              {site.open_data_enabled && site.open_data_url && (
                <ReadOnlyField label="URL" value={site.open_data_url} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* section-demarches */}
      <div id="section-demarches">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Démarches CNI & Passeport</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm font-medium text-muted-foreground">Dispositif de recueil</p>
                <Badge variant={site.demarches_identite?.has_dispositif_recueil ? 'default' : 'secondary'}>
                  {site.demarches_identite?.has_dispositif_recueil ? 'Oui' : 'Non'}
                </Badge>
              </div>
              {site.demarches_identite?.has_dispositif_recueil && (
                <>
                  {site.demarches_identite.appointment_provider && (
                    <ReadOnlyField label="Plateforme RDV" value={site.demarches_identite.appointment_provider} />
                  )}
                  {site.demarches_identite.appointment_url && (
                    <ReadOnlyField label="URL RDV" value={site.demarches_identite.appointment_url} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* section-homepage */}
      <div id="section-homepage">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Page d'accueil</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {site.homepage?.hero_title && <ReadOnlyField label="Titre Hero" value={site.homepage.hero_title} />}
              {site.homepage?.hero_subtitle && <ReadOnlyField label="Sous-titre" value={site.homepage.hero_subtitle} />}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={site.homepage?.show_quick_links ? 'default' : 'secondary'}>
                Accès rapides: {site.homepage?.show_quick_links ? 'Oui' : 'Non'}
              </Badge>
              <Badge variant={site.homepage?.show_articles ? 'default' : 'secondary'}>
                Actualités: {site.homepage?.show_articles ? 'Oui' : 'Non'}
              </Badge>
              <Badge variant={site.homepage?.show_events ? 'default' : 'secondary'}>
                Événements: {site.homepage?.show_events ? 'Oui' : 'Non'}
              </Badge>
              <Badge variant={site.homepage?.show_mayor_word ? 'default' : 'secondary'}>
                Mot du Maire: {site.homepage?.show_mayor_word ? 'Oui' : 'Non'}
              </Badge>
              <Badge variant={site.homepage?.show_key_figures ? 'default' : 'secondary'}>
                Chiffres clés: {site.homepage?.show_key_figures ? 'Oui' : 'Non'}
              </Badge>
              <Badge variant={site.homepage?.show_partners ? 'default' : 'secondary'}>
                Partenaires: {site.homepage?.show_partners ? 'Oui' : 'Non'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* section-navigation */}
      <div id="section-navigation">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
            {site.navigation_config && site.navigation_config.length > 0 ? (
              <div className="flex flex-col gap-2">
                {site.navigation_config.map((item, i) => (
                  <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {item.label || item.key} {item.type === 'page' && item.pageDocumentId && <span className="text-muted-foreground">(page)</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Navigation par défaut</p>
            )}
          </div>
        </div>
      </div>

      {/* section-social */}
      <div id="section-social">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">Réseaux sociaux</h2>
            {site.social_links && site.social_links.length > 0 ? (
              <div className="flex flex-col gap-2">
                {site.social_links.map((link, i) => (
                  <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm flex items-center gap-2">
                    <span className="font-medium capitalize">{link.platform}</span>
                    <span className="text-muted-foreground truncate">{link.url}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucun réseau social configuré</p>
            )}
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Informations système</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ReadOnlyField label="Créé le" value={new Date(site.createdAt).toLocaleDateString('fr-FR')} />
            <ReadOnlyField label="Modifié le" value={new Date(site.updatedAt).toLocaleDateString('fr-FR')} />
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-medium text-muted-foreground">ID du site</p>
              <p className="font-mono text-lg">{site.documentId}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ReadOnlyField({ label, value, bold, whitespace }: { label: string; value?: string | null; bold?: boolean; whitespace?: boolean }) {
  if (!value) return null
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={`text-lg ${bold ? 'font-semibold' : ''} ${whitespace ? 'whitespace-pre-line' : ''}`}>
        {value}
      </p>
    </div>
  )
}
