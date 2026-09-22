// Fichier généré par packages/core/scripts/generate-strapi-types.ts — ne pas modifier à la main.
// Régénérer avec : pnpm gen:types

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface StrapiDocument {
  id: number;
  documentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrapiPublishableDocument extends StrapiDocument {
  publishedAt: string | null;
}

export interface StrapiComponent {
  id: number;
}

export type DynamicZoneEntry<Uid extends string, T> = T & { __component: Uid };

export interface MediaFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  url: string;
}

/** Fichier de la médiathèque (`plugin::upload.file`) */
export interface Media extends StrapiDocument {
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  formats: Record<string, MediaFormat> | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
}

/** Rôle users-permissions (`plugin::users-permissions.role`) */
export interface Role extends StrapiDocument {
  name: string;
  description: string | null;
  type: string;
}

// --- Énumérations ---

export const homepageKeyFigureIconValues = ['users', 'map', 'building', 'calendar', 'heart', 'book', 'globe', 'shield', 'tree', 'star'] as const;
export type HomepageKeyFigureIcon = (typeof homepageKeyFigureIconValues)[number];

export const homepageQuickLinkIconValues = ['document', 'identity', 'folder', 'mail', 'alert', 'clock', 'phone', 'map', 'calendar', 'users', 'building', 'heart', 'info', 'shield', 'book', 'globe'] as const;
export type HomepageQuickLinkIcon = (typeof homepageQuickLinkIconValues)[number];

export const legalAccessibiliteAccessibilityLevelValues = ['non-conforme', 'partiellement-conforme', 'conforme'] as const;
export type LegalAccessibiliteAccessibilityLevel = (typeof legalAccessibiliteAccessibilityLevelValues)[number];

export const schoolMenuMealDayValues = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'] as const;
export type SchoolMenuMealDay = (typeof schoolMenuMealDayValues)[number];

export const socialSocialLinkPlatformValues = ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'autre'] as const;
export type SocialSocialLinkPlatform = (typeof socialSocialLinkPlatformValues)[number];

export const alerteSeverityValues = ['info', 'warning', 'critical'] as const;
export type AlerteSeverity = (typeof alerteSeverityValues)[number];

export const alerteAlertTypeValues = ['travaux', 'coupure-eau', 'coupure-electricite', 'deviation', 'intemperie', 'autre'] as const;
export type AlerteAlertType = (typeof alerteAlertTypeValues)[number];

export const articleCategoryValues = ['news', 'event', 'information', 'emergency'] as const;
export type ArticleCategory = (typeof articleCategoryValues)[number];

export const associationCategoryValues = ['sport', 'culture', 'social', 'environnement', 'education', 'autre'] as const;
export type AssociationCategory = (typeof associationCategoryValues)[number];

export const associationStatusValues = ['pending', 'published', 'rejected'] as const;
export type AssociationStatus = (typeof associationStatusValues)[number];

export const associationSubmissionSourceValues = ['manual', 'public_form'] as const;
export type AssociationSubmissionSource = (typeof associationSubmissionSourceValues)[number];

export const contactSubmissionCategoryValues = ['general', 'urbanisme', 'etat-civil', 'voirie', 'associations', 'rgpd', 'autre'] as const;
export type ContactSubmissionCategory = (typeof contactSubmissionCategoryValues)[number];

export const contactSubmissionStatusValues = ['received', 'in_progress', 'resolved', 'closed'] as const;
export type ContactSubmissionStatus = (typeof contactSubmissionStatusValues)[number];

export const contentBlockCategoryValues = ['header', 'footer', 'sidebar', 'content', 'cta', 'other'] as const;
export type ContentBlockCategory = (typeof contentBlockCategoryValues)[number];

export const deploymentStatusValues = ['building', 'ready', 'error'] as const;
export type DeploymentStatus = (typeof deploymentStatusValues)[number];

export const evenementCategoryValues = ['cultural', 'sport', 'meeting', 'celebration', 'workshop', 'conference'] as const;
export type EvenementCategory = (typeof evenementCategoryValues)[number];

export const officialDocumentDocumentTypeValues = ['pv-conseil-municipal', 'deliberation', 'arrete', 'plu', 'scot', 'carte-communale', 'budget-primitif', 'compte-administratif', 'rapport-orientations-budgetaires', 'autre'] as const;
export type OfficialDocumentDocumentType = (typeof officialDocumentDocumentTypeValues)[number];

export const pageTemplateValues = ['default', 'about', 'services'] as const;
export type PageTemplate = (typeof pageTemplateValues)[number];

export const schoolMenuMenuModeValues = ['image', 'manual'] as const;
export type SchoolMenuMenuMode = (typeof schoolMenuMenuModeValues)[number];

export const siteDomainStatusValues = ['pending', 'verified', 'error'] as const;
export type SiteDomainStatus = (typeof siteDomainStatusValues)[number];

export const siteDomainTypeValues = ['apex', 'subdomain'] as const;
export type SiteDomainType = (typeof siteDomainTypeValues)[number];

export const siteOpenDataPlatformValues = ['data-gouv-fr', 'opendatasoft', 'custom', 'none'] as const;
export type SiteOpenDataPlatform = (typeof siteOpenDataPlatformValues)[number];

export const teamMemberRoleValues = ['maire', 'adjoint', 'conseiller', 'dgs', 'agent'] as const;
export type TeamMemberRole = (typeof teamMemberRoleValues)[number];

export const wasteScheduleWasteTypeValues = ['ordures-menageres', 'tri-selectif', 'verre', 'dechets-verts', 'encombrants'] as const;
export type WasteScheduleWasteType = (typeof wasteScheduleWasteTypeValues)[number];

export const wasteScheduleCollectionDayValues = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
export type WasteScheduleCollectionDay = (typeof wasteScheduleCollectionDayValues)[number];

export const wasteScheduleFrequencyValues = ['hebdomadaire', 'bimensuel', 'mensuel'] as const;
export type WasteScheduleFrequency = (typeof wasteScheduleFrequencyValues)[number];

export const userMunicipalityRoleValues = ['super_admin', 'admin', 'editor'] as const;
export type UserMunicipalityRole = (typeof userMunicipalityRoleValues)[number];

// --- Composants ---

/** Composant `homepage.homepage-config` */
export interface HomepageHomepageConfig extends StrapiComponent {
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image?: Media | null;
  hero_cta_primary_label: string | null;
  hero_cta_primary_url: string | null;
  hero_cta_secondary_label: string | null;
  hero_cta_secondary_url: string | null;
  content: string | null;
  meta_description: string | null;
  show_quick_links: boolean | null;
  quick_links?: HomepageQuickLink[];
  show_mayor_word: boolean | null;
  mayor_word_title: string | null;
  mayor_word_content: string | null;
  show_articles: boolean | null;
  articles_count: number | null;
  show_events: boolean | null;
  events_count: number | null;
  show_key_figures: boolean | null;
  key_figures?: HomepageKeyFigure[];
  show_associations: boolean | null;
  associations_count: number | null;
  show_partners: boolean | null;
  partners?: HomepagePartner[];
  show_weather: boolean | null;
  show_waste_collection: boolean | null;
  show_disruptions: boolean | null;
  show_newsletter: boolean | null;
  show_school_menu: boolean | null;
}

/** Composant `homepage.key-figure` */
export interface HomepageKeyFigure extends StrapiComponent {
  value: string;
  label: string;
  icon: HomepageKeyFigureIcon | null;
}

/** Composant `homepage.partner` */
export interface HomepagePartner extends StrapiComponent {
  name: string;
  logo?: Media | null;
  url: string | null;
}

/** Composant `homepage.quick-link` */
export interface HomepageQuickLink extends StrapiComponent {
  label: string;
  url: string;
  description: string | null;
  icon: HomepageQuickLinkIcon | null;
}

/** Composant `legal.accessibilite` */
export interface LegalAccessibilite extends StrapiComponent {
  accessibility_level: LegalAccessibiliteAccessibilityLevel | null;
  accessibility_declaration: string | null;
  accessibility_schema_url: string | null;
  accessibility_action_plan_url: string | null;
}

/** Composant `legal.infos-pratiques` */
export interface LegalInfosPratiques extends StrapiComponent {
  opening_hours: JsonValue | null;
  population: number | null;
  contact_form_intro: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Composant `legal.mentions-legales` */
export interface LegalMentionsLegales extends StrapiComponent {
  siret: string | null;
  publication_director: string | null;
  publication_director_title: string | null;
  hebergeur_name: string | null;
  hebergeur_address: string | null;
  hebergeur_phone: string | null;
  credits: string | null;
  mentions_legales_extra: string | null;
}

/** Composant `legal.rgpd` */
export interface LegalRgpd extends StrapiComponent {
  rgpd_policy: string | null;
  dpo_name: string | null;
  dpo_email: string | null;
  dpo_phone: string | null;
}

/** Composant `school-menu.meal` */
export interface SchoolMenuMeal extends StrapiComponent {
  day: SchoolMenuMealDay;
  starter: string | null;
  main_course: string;
  side_dish: string | null;
  dairy: string | null;
  dessert: string | null;
  snack: string | null;
  labels: JsonValue | null;
}

/** Composant `social.social-link` */
export interface SocialSocialLink extends StrapiComponent {
  platform: SocialSocialLinkPlatform;
  url: string;
  label: string | null;
  icon?: Media | null;
}

// --- Content-types ---

/** Content-type `api::alerte.alerte` — Alertes et bandeaux d'urgence affichés en haut du site */
export interface Alerte extends StrapiDocument {
  title: string;
  message: string;
  severity: AlerteSeverity;
  active: boolean;
  display_from: string | null;
  display_until: string | null;
  link_url: string | null;
  link_label: string | null;
  alert_type: AlerteAlertType | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  affected_area: string | null;
  site?: Site | null;
}

/** Content-type `api::article.article` — News articles and posts */
export interface Article extends StrapiPublishableDocument {
  title: string;
  slug: string;
  content: string;
  image?: Media | null;
  publication_date: string | null;
  summary: string | null;
  category: ArticleCategory;
  author: string | null;
  featured: boolean | null;
  meta_description: string | null;
  scheduled_at: string | null;
  view_count: number | null;
  site?: Site | null;
}

/** Content-type `api::association.association` — Annuaire des associations de la commune */
export interface Association extends StrapiDocument {
  name: string;
  description: string | null;
  category: AssociationCategory;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  logo?: Media | null;
  status: AssociationStatus;
  submission_source: AssociationSubmissionSource;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  reviewed_at: string | null;
  site?: Site | null;
}

/** Content-type `api::contact-submission.contact-submission` */
export interface ContactSubmission extends StrapiDocument {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  category: ContactSubmissionCategory;
  status: ContactSubmissionStatus;
  reference_number: string | null;
  acknowledgment_sent: boolean | null;
  acknowledged_at: string | null;
  response: string | null;
  responded_at: string | null;
  attachments?: Media[];
  site?: Site | null;
}

/** Content-type `api::content-block.content-block` — Blocs de contenu réutilisables dans l'éditeur */
export interface ContentBlock extends StrapiDocument {
  name: string;
  content: string;
  category: ContentBlockCategory;
  site?: Site | null;
}

/** Content-type `api::deployment.deployment` — Track deployments to Netlify */
export interface Deployment extends StrapiDocument {
  site?: Site | null;
  deployment_id: string;
  status: DeploymentStatus;
  triggered_by?: User | null;
  build_time: number | null;
  error_message: string | null;
  deployment_url: string | null;
  triggered_at: string;
  completed_at: string | null;
}

/** Content-type `api::evenement.evenement` — Municipal events and activities */
export interface Evenement extends StrapiPublishableDocument {
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  image?: Media | null;
  price: string | null;
  external_link: string | null;
  slug: string;
  category: EvenementCategory;
  organizer: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  max_participants: number | null;
  registration_required: boolean | null;
  registration_deadline: string | null;
  address: string | null;
  featured: boolean | null;
  site?: Site | null;
  scheduled_at: string | null;
}

/** Content-type `api::media-item.media-item` — Bibliothèque de médias avec isolation par site */
export interface MediaItem extends StrapiDocument {
  name: string;
  alt_text: string | null;
  caption: string | null;
  folder: string | null;
  file?: Media | null;
  site?: Site | null;
}

/** Content-type `api::newsletter-subscriber.newsletter-subscriber` */
export interface NewsletterSubscriber extends StrapiDocument {
  email: string;
  first_name: string | null;
  last_name: string | null;
  subscribed_at: string;
  active: boolean;
  site?: Site | null;
}

/** Content-type `api::official-document.official-document` — Documents officiels des communes (PV, délibérations, arrêtés, budgets) */
export interface OfficialDocument extends StrapiPublishableDocument {
  title: string;
  slug: string;
  description: string | null;
  document_type: OfficialDocumentDocumentType;
  document_date: string;
  session_date: string | null;
  file?: Media | null;
  additional_files?: Media[];
  reference_number: string | null;
  year: number;
  site?: Site | null;
  scheduled_at: string | null;
}

/** Content-type `api::page.page` */
export interface Page extends StrapiPublishableDocument {
  title: string;
  slug: string;
  content: string;
  meta_description: string | null;
  featured_image?: Media | null;
  menu_order: number | null;
  show_in_menu: boolean | null;
  template: PageTemplate | null;
  scheduled_at: string | null;
  seo_keywords: string | null;
  site?: Site | null;
}

/** Content-type `api::school-menu.school-menu` — Menus de cantine scolaire par semaine */
export interface SchoolMenu extends StrapiDocument {
  week_start: string;
  menu_mode: SchoolMenuMenuMode;
  menu_image?: Media | null;
  menu_pdf?: Media | null;
  meals?: SchoolMenuMeal[];
  school_name: string | null;
  site?: Site | null;
}

/** Content-type `api::site.site` */
export interface Site extends StrapiDocument {
  name: string;
  slug: string;
  colors: JsonValue | null;
  logo?: Media | null;
  favicon?: Media | null;
  contact_mail: string;
  contact_phone: string | null;
  address: string | null;
  live_url: string | null;
  custom_domain: string | null;
  domain_status: SiteDomainStatus | null;
  domain_type: SiteDomainType | null;
  domain_configured_at: string | null;
  ssl_enabled: boolean | null;
  pages?: Page[];
  articles?: Article[];
  evenements?: Evenement[];
  deployments?: Deployment[];
  contact_submissions?: ContactSubmission[];
  official_documents?: OfficialDocument[];
  team_members?: TeamMember[];
  associations?: Association[];
  alertes?: Alerte[];
  waste_schedules?: WasteSchedule[];
  media_items?: MediaItem[];
  mentions_legales?: LegalMentionsLegales | null;
  rgpd?: LegalRgpd | null;
  accessibilite?: LegalAccessibilite | null;
  infos_pratiques?: LegalInfosPratiques | null;
  open_data_enabled: boolean | null;
  open_data_url: string | null;
  open_data_platform: SiteOpenDataPlatform | null;
  homepage?: HomepageHomepageConfig | null;
  auto_deploy_enabled: boolean | null;
  auto_deploy_delay: number | null;
  navigation_config: JsonValue | null;
  newsletter_subscribers?: NewsletterSubscriber[];
  social_links?: SocialSocialLink[];
  school_menus?: SchoolMenu[];
  code_insee: string | null;
  comarquage_enabled: boolean | null;
  comarquage_audiences: JsonValue | null;
}

/** Content-type `api::team-member.team-member` — Municipal team members */
export interface TeamMember extends StrapiDocument {
  first_name: string;
  last_name: string;
  role: TeamMemberRole;
  delegation: string | null;
  bio: string | null;
  photo?: Media | null;
  display_order: number | null;
  site?: Site | null;
}

/** Content-type `api::waste-schedule.waste-schedule` — Planning de collecte des dechets par type et jour */
export interface WasteSchedule extends StrapiDocument {
  waste_type: WasteScheduleWasteType;
  collection_day: WasteScheduleCollectionDay;
  frequency: WasteScheduleFrequency;
  start_date: string | null;
  zone: string | null;
  notes: string | null;
  active: boolean;
  site?: Site | null;
}

/** Content-type `plugin::users-permissions.user` */
export interface User extends StrapiDocument {
  username: string;
  email: string;
  provider: string | null;
  confirmed: boolean | null;
  blocked: boolean | null;
  role?: Role | null;
  site?: Site | null;
  municipality_role: UserMunicipalityRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  active: boolean | null;
}

/** Nom pluriel de chaque content-type, utilisé dans les routes REST (`/api/<pluralName>`) */
export const pluralNames = {
  'api::alerte.alerte': 'alertes',
  'api::article.article': 'articles',
  'api::association.association': 'associations',
  'api::contact-submission.contact-submission': 'contact-submissions',
  'api::content-block.content-block': 'content-blocks',
  'api::deployment.deployment': 'deployments',
  'api::evenement.evenement': 'evenements',
  'api::media-item.media-item': 'media-items',
  'api::newsletter-subscriber.newsletter-subscriber': 'newsletter-subscribers',
  'api::official-document.official-document': 'official-documents',
  'api::page.page': 'pages',
  'api::school-menu.school-menu': 'school-menus',
  'api::site.site': 'sites',
  'api::team-member.team-member': 'team-members',
  'api::waste-schedule.waste-schedule': 'waste-schedules',
} as const;

export type ContentTypeUid = keyof typeof pluralNames;

export interface ContentTypes {
  'api::alerte.alerte': Alerte;
  'api::article.article': Article;
  'api::association.association': Association;
  'api::contact-submission.contact-submission': ContactSubmission;
  'api::content-block.content-block': ContentBlock;
  'api::deployment.deployment': Deployment;
  'api::evenement.evenement': Evenement;
  'api::media-item.media-item': MediaItem;
  'api::newsletter-subscriber.newsletter-subscriber': NewsletterSubscriber;
  'api::official-document.official-document': OfficialDocument;
  'api::page.page': Page;
  'api::school-menu.school-menu': SchoolMenu;
  'api::site.site': Site;
  'api::team-member.team-member': TeamMember;
  'api::waste-schedule.waste-schedule': WasteSchedule;
  'plugin::users-permissions.user': User;
}

export interface Components {
  'homepage.homepage-config': HomepageHomepageConfig;
  'homepage.key-figure': HomepageKeyFigure;
  'homepage.partner': HomepagePartner;
  'homepage.quick-link': HomepageQuickLink;
  'legal.accessibilite': LegalAccessibilite;
  'legal.infos-pratiques': LegalInfosPratiques;
  'legal.mentions-legales': LegalMentionsLegales;
  'legal.rgpd': LegalRgpd;
  'school-menu.meal': SchoolMenuMeal;
  'social.social-link': SocialSocialLink;
}
