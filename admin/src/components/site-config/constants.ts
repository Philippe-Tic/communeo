import { Building2, Scale, Shield, Accessibility, Info, Database, FileText, Home, Navigation, Share2 } from 'lucide-react'
import type { QuickLinkIcon, KeyFigureIcon, SocialPlatform } from '../../hooks/api/useSites'
import type { SectionConfig } from './types'

export const QUICK_LINK_ICON_OPTIONS: { value: QuickLinkIcon; label: string }[] = [
  { value: 'document', label: 'Document' },
  { value: 'identity', label: 'Identité' },
  { value: 'folder', label: 'Dossier' },
  { value: 'mail', label: 'Courrier' },
  { value: 'alert', label: 'Alerte' },
  { value: 'clock', label: 'Horloge' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'map', label: 'Carte' },
  { value: 'calendar', label: 'Calendrier' },
  { value: 'users', label: 'Personnes' },
  { value: 'building', label: 'Bâtiment' },
  { value: 'heart', label: 'Cœur' },
  { value: 'info', label: 'Information' },
  { value: 'shield', label: 'Bouclier' },
  { value: 'book', label: 'Livre' },
  { value: 'globe', label: 'Globe' },
]

export const KEY_FIGURE_ICON_OPTIONS: { value: KeyFigureIcon; label: string }[] = [
  { value: 'users', label: 'Personnes' },
  { value: 'map', label: 'Carte' },
  { value: 'building', label: 'Bâtiment' },
  { value: 'calendar', label: 'Calendrier' },
  { value: 'heart', label: 'Cœur' },
  { value: 'book', label: 'Livre' },
  { value: 'globe', label: 'Globe' },
  { value: 'shield', label: 'Bouclier' },
  { value: 'tree', label: 'Arbre' },
  { value: 'star', label: 'Étoile' },
]

export const SOCIAL_PLATFORM_OPTIONS: { value: SocialPlatform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'autre', label: 'Autre' },
]

export const RGPD_TEMPLATE = `<h2>Politique de confidentialité</h2>
<p>La commune de <strong>[NOM DE LA COMMUNE]</strong> s'engage à protéger la vie privée des utilisateurs de son site internet, conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée.</p>

<h3>Responsable du traitement</h3>
<p>Le responsable du traitement des données est la commune de <strong>[NOM DE LA COMMUNE]</strong>, représentée par son Maire.</p>

<h3>Données collectées</h3>
<p>Dans le cadre de l'utilisation de ce site, les données suivantes peuvent être collectées :</p>
<ul>
<li>Données d'identification : nom, prénom, adresse email, numéro de téléphone</li>
<li>Données de connexion : adresse IP, date et heure de connexion, pages consultées</li>
<li>Données transmises via les formulaires de contact</li>
</ul>

<h3>Finalités du traitement</h3>
<p>Les données personnelles sont collectées pour :</p>
<ul>
<li>Répondre aux demandes des usagers via le formulaire de contact</li>
<li>Assurer le bon fonctionnement et la sécurité du site</li>
<li>Établir des statistiques de fréquentation anonymisées</li>
</ul>

<h3>Base légale</h3>
<p>Le traitement des données repose sur :</p>
<ul>
<li>L'exécution d'une mission d'intérêt public (article 6.1.e du RGPD)</li>
<li>Le consentement de l'utilisateur pour les cookies non essentiels (article 6.1.a du RGPD)</li>
</ul>

<h3>Durée de conservation</h3>
<p>Les données personnelles sont conservées pendant une durée n'excédant pas celle nécessaire aux finalités pour lesquelles elles sont collectées, conformément à la réglementation en vigueur.</p>

<h3>Droits des personnes</h3>
<p>Conformément au RGPD, vous disposez des droits suivants :</p>
<ul>
<li>Droit d'accès à vos données personnelles</li>
<li>Droit de rectification</li>
<li>Droit à l'effacement</li>
<li>Droit à la limitation du traitement</li>
<li>Droit à la portabilité</li>
<li>Droit d'opposition</li>
</ul>
<p>Pour exercer ces droits, contactez le Délégué à la Protection des Données (DPO) aux coordonnées indiquées dans les mentions légales.</p>

<h3>Cookies</h3>
<p>Ce site utilise des cookies essentiels au fonctionnement du site. Les cookies non essentiels ne sont déposés qu'après recueil de votre consentement via le bandeau cookies.</p>

<h3>Réclamation</h3>
<p>Si vous estimez que le traitement de vos données constitue une violation du RGPD, vous pouvez introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>.</p>`

export const SECTION_FIELDS: Record<string, string[]> = {
  general: ['name', 'contact_mail', 'colors'],
  legal: ['siret', 'publication_director', 'hebergeur_name'],
  rgpd: ['dpo_name', 'dpo_email', 'rgpd_policy'],
  accessibility: ['accessibility_level'],
  info: ['opening_hours'],
  opendata: [],
  demarches: ['appointment_url'],
  homepage: [],
  navigation: [],
  social: [],
}

export const SECTIONS: SectionConfig[] = [
  { key: 'general', label: 'Informations générales', icon: Building2 },
  { key: 'legal', label: 'Mentions légales', icon: Scale },
  { key: 'rgpd', label: 'RGPD', icon: Shield },
  { key: 'accessibility', label: 'Accessibilité', icon: Accessibility },
  { key: 'info', label: 'Infos pratiques', icon: Info },
  { key: 'opendata', label: 'Open Data', icon: Database },
  { key: 'demarches', label: 'Démarches', icon: FileText },
  { key: 'homepage', label: "Page d'accueil", icon: Home },
  { key: 'navigation', label: 'Navigation', icon: Navigation },
  { key: 'social', label: 'Réseaux sociaux', icon: Share2 },
]
