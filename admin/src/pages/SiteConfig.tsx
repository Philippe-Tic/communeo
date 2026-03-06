import { useNavigate } from 'react-router-dom'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import {
  SiteConfigNav,
  SiteConfigMobileNav,
  SiteConfigReadOnly,
  SECTIONS,
} from '../components/site-config'
import { useSite } from '../hooks/api/useSites'
import { useCanManageSite, useUserSite } from '../hooks/useUser'
import { useActiveSection } from '../hooks/useActiveSection'
import { useIsMobile } from '../hooks/useIsMobile'

const SECTION_KEYS = SECTIONS.map(s => s.key)

export const SiteConfig = () => {
  const { site: userSite } = useUserSite()
  const { canEditConfig, hasSite } = useCanManageSite()
  const { data: site, isLoading, error } = useSite(userSite?.documentId || '')
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [activeSection, scrollToSection] = useActiveSection(SECTION_KEYS)

  if (!hasSite) {
    return <ErrorState title="Site non trouvé" message="Aucun site associé à votre compte" />
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorState title="Erreur de chargement" message="Impossible de charger la configuration du site" />
  if (!site) return <ErrorState title="Site non trouvé" message="Aucune configuration de site disponible" />

  return (
    <div className="mx-auto w-full">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Configuration du site"
          subtitle="Paramètres et informations du site"
          actions={canEditConfig ? [
            {
              label: "Modifier",
              onClick: () => navigate('/site/edit'),
              colorScheme: "blue"
            }
          ] : []}
        />

        {!canEditConfig && (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Information :</strong> Vous pouvez consulter la configuration mais seuls les administrateurs peuvent la modifier.
            </p>
          </div>
        )}

        {isMobile ? (
          <SiteConfigMobileNav
            sections={SECTIONS}
            renderSection={(key) => {
              // Render the matching section content from SiteConfigReadOnly
              // We need to render all sections individually for mobile accordion
              return <ReadOnlySectionContent sectionKey={key} site={site} />
            }}
          />
        ) : (
          <div className="flex gap-6">
            <SiteConfigNav
              sections={SECTIONS}
              activeSection={activeSection}
              onSectionClick={scrollToSection}
            />
            <div className="flex-1 flex flex-col gap-6">
              <SiteConfigReadOnly site={site} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Individual read-only section for mobile accordion
function ReadOnlySectionContent({ sectionKey, site }: { sectionKey: string; site: any }) {
  // Re-use SiteConfigReadOnly but extract just the section we need
  // Since SiteConfigReadOnly renders all sections with ids, we render it once
  // and the accordion wraps each one. For mobile, we render the full component
  // but with only the relevant section visible.
  return <SiteConfigReadOnlySection sectionKey={sectionKey} site={site} />
}

// Extracted individual sections for mobile accordion use
import { Badge } from '@/components/ui/badge'
import { getMediaUrl } from '@/lib/utils'

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

function SiteConfigReadOnlySection({ sectionKey, site }: { sectionKey: string; site: any }) {
  switch (sectionKey) {
    case 'general':
      return (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4">
            <ReadOnlyField label="Nom du site" value={site.name} bold />
            <ReadOnlyField label="Slug" value={site.slug} />
            <ReadOnlyField label="Email de contact" value={site.contact_mail} />
            {site.contact_phone && <ReadOnlyField label="Téléphone" value={site.contact_phone} />}
            {site.address && <ReadOnlyField label="Adresse" value={site.address} whitespace />}
          </div>
          {site.logo && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Logo</p>
              <img src={getMediaUrl(site.logo.url)} alt={`Logo de ${site.name}`} className="max-h-[120px] rounded-md object-contain" />
            </div>
          )}
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm font-medium text-muted-foreground">Déploiement auto</p>
            <Badge variant={site.auto_deploy_enabled ? 'default' : 'secondary'}>
              {site.auto_deploy_enabled ? 'Activé' : 'Désactivé'}
            </Badge>
          </div>
        </div>
      )
    case 'legal':
      return (
        <div className="grid grid-cols-1 gap-4">
          <ReadOnlyField label="SIRET" value={site.mentions_legales?.siret} />
          <ReadOnlyField label="Directeur de publication" value={site.mentions_legales?.publication_director} />
          <ReadOnlyField label="Hébergeur" value={site.mentions_legales?.hebergeur_name} />
        </div>
      )
    case 'rgpd':
      return (
        <div className="grid grid-cols-1 gap-4">
          <ReadOnlyField label="Nom du DPO" value={site.rgpd?.dpo_name} />
          <ReadOnlyField label="Email du DPO" value={site.rgpd?.dpo_email} />
          {site.rgpd?.rgpd_policy && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Politique de confidentialité</p>
              <Badge variant="default">Configurée</Badge>
            </div>
          )}
        </div>
      )
    case 'accessibility':
      return (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm font-medium text-muted-foreground">Niveau de conformité</p>
          <Badge variant={site.accessibilite?.accessibility_level === 'conforme' ? 'default' : 'secondary'}>
            {site.accessibilite?.accessibility_level || 'Non renseigné'}
          </Badge>
        </div>
      )
    case 'info':
      return (
        <div className="grid grid-cols-1 gap-4">
          {site.infos_pratiques?.population && <ReadOnlyField label="Population" value={site.infos_pratiques.population.toString()} />}
          {site.infos_pratiques?.opening_hours && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Horaires</p>
              <Badge variant="default">Configurés</Badge>
            </div>
          )}
        </div>
      )
    case 'opendata':
      return (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm font-medium text-muted-foreground">Statut</p>
          <Badge variant={site.open_data_enabled ? 'default' : 'secondary'}>
            {site.open_data_enabled ? 'Activé' : 'Désactivé'}
          </Badge>
        </div>
      )
    case 'demarches':
      return (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm font-medium text-muted-foreground">Dispositif de recueil</p>
          <Badge variant={site.demarches_identite?.has_dispositif_recueil ? 'default' : 'secondary'}>
            {site.demarches_identite?.has_dispositif_recueil ? 'Oui' : 'Non'}
          </Badge>
        </div>
      )
    case 'homepage':
      return (
        <div className="flex flex-col gap-4">
          {site.homepage?.hero_title && <ReadOnlyField label="Titre Hero" value={site.homepage.hero_title} />}
          <div className="flex flex-wrap gap-2">
            <Badge variant={site.homepage?.show_quick_links ? 'default' : 'secondary'}>Accès rapides</Badge>
            <Badge variant={site.homepage?.show_articles ? 'default' : 'secondary'}>Actualités</Badge>
            <Badge variant={site.homepage?.show_events ? 'default' : 'secondary'}>Événements</Badge>
          </div>
        </div>
      )
    case 'navigation':
      return site.navigation_config?.length > 0 ? (
        <div className="flex flex-col gap-2">
          {site.navigation_config.map((item: any, i: number) => (
            <div key={i} className="text-sm">{item.label}</div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Navigation par défaut</p>
      )
    case 'social':
      return site.social_links?.length > 0 ? (
        <div className="flex flex-col gap-2">
          {site.social_links.map((link: any, i: number) => (
            <div key={i} className="text-sm capitalize">{link.platform}: {link.url}</div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Aucun réseau social</p>
      )
    default:
      return null
  }
}
