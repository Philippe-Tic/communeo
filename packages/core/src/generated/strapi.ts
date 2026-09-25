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
  /** Crédit (photographe, source) : champ ajouté au fichier par la commune (extension upload) */
  credit?: string | null;
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

export const blockPartsButtonStyleValues = ['primary', 'secondary'] as const;
export type BlockPartsButtonStyle = (typeof blockPartsButtonStyleValues)[number];

export const blocksCalloutVariantValues = ['info', 'warning', 'important', 'tip'] as const;
export type BlocksCalloutVariant = (typeof blocksCalloutVariantValues)[number];

export const blocksImageWidthValues = ['normal', 'full'] as const;
export type BlocksImageWidth = (typeof blocksImageWidthValues)[number];

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

export const activityLogActionValues = ['login', 'publish', 'unpublish', 'delete', 'theme_change', 'domain_change', 'user_invite', 'role_change', 'user_deactivate', 'user_reactivate', 'user_delete', 'commune_create', 'commune_suspend', 'commune_unsuspend', 'commune_delete', 'trial_extend', 'trial_expire', 'live_request', 'commune_go_live', 'live_reject', 'signup_reject', 'quote_sign'] as const;
export type ActivityLogAction = (typeof activityLogActionValues)[number];

export const alerteSeverityValues = ['info', 'warning', 'critical'] as const;
export type AlerteSeverity = (typeof alerteSeverityValues)[number];

export const alerteAlertTypeValues = ['travaux', 'coupure-eau', 'coupure-electricite', 'deviation', 'intemperie', 'autre'] as const;
export type AlerteAlertType = (typeof alerteAlertTypeValues)[number];

export const articleCategoryValues = ['vie-municipale', 'travaux', 'vie-pratique', 'ecoles-jeunesse', 'culture-loisirs', 'associations', 'environnement', 'sante-solidarite'] as const;
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

export const contentVersionKindValues = ['published', 'draft'] as const;
export type ContentVersionKind = (typeof contentVersionKindValues)[number];

export const deploymentStatusValues = ['building', 'ready', 'error'] as const;
export type DeploymentStatus = (typeof deploymentStatusValues)[number];

export const deploymentReasonValues = ['manual', 'content', 'scheduled', 'domain'] as const;
export type DeploymentReason = (typeof deploymentReasonValues)[number];

export const deploymentStepValues = ['checking', 'rendering', 'publishing', 'cache'] as const;
export type DeploymentStep = (typeof deploymentStepValues)[number];

export const evenementCategoryValues = ['cultural', 'sport', 'meeting', 'celebration', 'workshop', 'conference'] as const;
export type EvenementCategory = (typeof evenementCategoryValues)[number];

export const officialDocumentDocumentTypeValues = ['pv-conseil-municipal', 'deliberation', 'arrete', 'plu', 'scot', 'carte-communale', 'budget-primitif', 'compte-administratif', 'rapport-orientations-budgetaires', 'autre'] as const;
export type OfficialDocumentDocumentType = (typeof officialDocumentDocumentTypeValues)[number];

export const pendingChangeActionValues = ['publish', 'unpublish', 'delete', 'create', 'update'] as const;
export type PendingChangeAction = (typeof pendingChangeActionValues)[number];

export const pendingChangeSourceValues = ['person', 'scheduled'] as const;
export type PendingChangeSource = (typeof pendingChangeSourceValues)[number];

export const quoteStatusValues = ['signed', 'accepted', 'rejected'] as const;
export type QuoteStatus = (typeof quoteStatusValues)[number];

export const schoolMenuMenuModeValues = ['image', 'manual'] as const;
export type SchoolMenuMenuMode = (typeof schoolMenuMenuModeValues)[number];

export const signupRequestStatusValues = ['pending_confirmation', 'awaiting_review', 'confirmed', 'rejected'] as const;
export type SignupRequestStatus = (typeof signupRequestStatusValues)[number];

export const siteThemeValues = ['institutionnel', 'moderne', 'journal', 'bourg'] as const;
export type SiteTheme = (typeof siteThemeValues)[number];

export const siteDomainStatusValues = ['pending', 'verified', 'error'] as const;
export type SiteDomainStatus = (typeof siteDomainStatusValues)[number];

export const siteDomainTypeValues = ['apex', 'subdomain'] as const;
export type SiteDomainType = (typeof siteDomainTypeValues)[number];

export const sitePlanValues = ['trial', 'live', 'expired'] as const;
export type SitePlan = (typeof sitePlanValues)[number];

export const siteTrialNoticeValues = ['reminder_7', 'reminder_1', 'expired', 'deletion'] as const;
export type SiteTrialNotice = (typeof siteTrialNoticeValues)[number];

export const siteOpenDataPlatformValues = ['data-gouv-fr', 'opendatasoft', 'custom', 'none'] as const;
export type SiteOpenDataPlatform = (typeof siteOpenDataPlatformValues)[number];

export const teamMemberRoleValues = ['maire', 'adjoint', 'conseiller', 'dgs', 'agent'] as const;
export type TeamMemberRole = (typeof teamMemberRoleValues)[number];

export const wasteScheduleWasteTypeValues = ['ordures-menageres', 'tri-selectif', 'verre', 'dechets-verts', 'encombrants'] as const;
export type WasteScheduleWasteType = (typeof wasteScheduleWasteTypeValues)[number];

export const wasteScheduleCollectionDayValues = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
export type WasteScheduleCollectionDay = (typeof wasteScheduleCollectionDayValues)[number];

export const wasteScheduleFrequencyValues = ['hebdomadaire', 'semaines-paires', 'semaines-impaires', 'bimensuel', 'mensuel', 'apport-volontaire', 'sur-rendez-vous'] as const;
export type WasteScheduleFrequency = (typeof wasteScheduleFrequencyValues)[number];

export const userMunicipalityRoleValues = ['super_admin', 'admin', 'editor'] as const;
export type UserMunicipalityRole = (typeof userMunicipalityRoleValues)[number];

// --- Composants ---

/** Composant `block-parts.button` */
export interface BlockPartsButton extends StrapiComponent {
  label: string;
  url: string;
  style: BlockPartsButtonStyle | null;
}

/** Composant `block-parts.faq-item` */
export interface BlockPartsFaqItem extends StrapiComponent {
  question: string;
  answer: JsonValue;
}

/** Composant `blocks.buttons` */
export interface BlocksButtons extends StrapiComponent {
  buttons?: BlockPartsButton[];
}

/** Composant `blocks.callout` */
export interface BlocksCallout extends StrapiComponent {
  variant: BlocksCalloutVariant;
  title: string | null;
  body: JsonValue;
}

/** Composant `blocks.contact` */
export interface BlocksContact extends StrapiComponent {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  show_map: boolean | null;
}

/** Composant `blocks.documents` */
export interface BlocksDocuments extends StrapiComponent {
  title: string | null;
  files?: Media[];
}

/** Composant `blocks.faq` */
export interface BlocksFaq extends StrapiComponent {
  title: string | null;
  items?: BlockPartsFaqItem[];
}

/** Composant `blocks.gallery` */
export interface BlocksGallery extends StrapiComponent {
  title: string | null;
  images?: Media[];
}

/** Composant `blocks.image` */
export interface BlocksImage extends StrapiComponent {
  image?: Media | null;
  caption: string | null;
  width: BlocksImageWidth | null;
}

/** Composant `blocks.text` */
export interface BlocksText extends StrapiComponent {
  body: JsonValue;
}

/** Composant `blocks.video` */
export interface BlocksVideo extends StrapiComponent {
  url: string;
  title: string;
  transcript: string | null;
}

/** Composant `home-sections.free-content` */
export interface HomeSectionsFreeContent extends StrapiComponent {
  enabled: boolean;
  title: string | null;
  body: JsonValue | null;
}

/** Composant `home-sections.hero` */
export interface HomeSectionsHero extends StrapiComponent {
  enabled: boolean;
  title: string | null;
  subtitle: string | null;
  image?: Media | null;
  primary_label: string | null;
  primary_url: string | null;
  secondary_label: string | null;
  secondary_url: string | null;
}

/** Composant `home-sections.key-figures` */
export interface HomeSectionsKeyFigures extends StrapiComponent {
  enabled: boolean;
  items?: HomepageKeyFigure[];
}

/** Composant `home-sections.listing` */
export interface HomeSectionsListing extends StrapiComponent {
  enabled: boolean;
  count: number | null;
}

/** Composant `home-sections.mayor-word` */
export interface HomeSectionsMayorWord extends StrapiComponent {
  enabled: boolean;
  title: string | null;
  body: JsonValue | null;
  photo?: Media | null;
  signature_name: string | null;
  signature_role: string | null;
}

/** Composant `home-sections.partners` */
export interface HomeSectionsPartners extends StrapiComponent {
  enabled: boolean;
  items?: HomepagePartner[];
}

/** Composant `home-sections.quick-links` */
export interface HomeSectionsQuickLinks extends StrapiComponent {
  enabled: boolean;
  items?: HomepageQuickLink[];
}

/** Composant `home-sections.toggle` */
export interface HomeSectionsToggle extends StrapiComponent {
  enabled: boolean;
}

/** Composant `homepage.homepage` */
export interface HomepageHomepage extends StrapiComponent {
  hero?: HomeSectionsHero | null;
  quick_links?: HomeSectionsQuickLinks | null;
  featured_news?: HomeSectionsListing | null;
  agenda?: HomeSectionsListing | null;
  mayor_word?: HomeSectionsMayorWord | null;
  key_figures?: HomeSectionsKeyFigures | null;
  practical_info?: HomeSectionsToggle | null;
  weather?: HomeSectionsToggle | null;
  waste_collection?: HomeSectionsToggle | null;
  disruptions?: HomeSectionsToggle | null;
  canteen?: HomeSectionsToggle | null;
  associations?: HomeSectionsListing | null;
  partners?: HomeSectionsPartners | null;
  newsletter?: HomeSectionsToggle | null;
  free_content?: HomeSectionsFreeContent | null;
  meta_description: string | null;
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
  accessibility_declaration: JsonValue | null;
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
  credits: JsonValue | null;
  mentions_legales_extra: JsonValue | null;
}

/** Composant `legal.rgpd` */
export interface LegalRgpd extends StrapiComponent {
  rgpd_policy: JsonValue | null;
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

/** Content-type `api::activity-log.activity-log` — Actions sensibles (connexions, publications, suppressions, rôles, thème, domaine, communes), gardées 6 mois */
export interface ActivityLog extends StrapiDocument {
  site?: Site | null;
  action: ActivityLogAction;
  actor?: User | null;
  actor_name: string | null;
  on_behalf: boolean | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  ip: string | null;
  details: JsonValue | null;
}

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
  image?: Media | null;
  publication_date: string | null;
  summary: string | null;
  blocks?: Array<DynamicZoneEntry<'blocks.text', BlocksText> | DynamicZoneEntry<'blocks.image', BlocksImage> | DynamicZoneEntry<'blocks.buttons', BlocksButtons> | DynamicZoneEntry<'blocks.callout', BlocksCallout> | DynamicZoneEntry<'blocks.documents', BlocksDocuments> | DynamicZoneEntry<'blocks.gallery', BlocksGallery> | DynamicZoneEntry<'blocks.faq', BlocksFaq> | DynamicZoneEntry<'blocks.contact', BlocksContact> | DynamicZoneEntry<'blocks.video', BlocksVideo>>;
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
  rejection_reason: string | null;
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
  opened_at: string | null;
  history: JsonValue | null;
}

/** Content-type `api::content-version.content-version` — Instantané d'une page, actualité, événement ou document à chaque publication (historique, restauration) */
export interface ContentVersion extends StrapiDocument {
  site?: Site | null;
  content_type: string;
  content_document_id: string;
  kind: ContentVersionKind;
  snapshot: JsonValue;
  summary: string | null;
  block_count: number | null;
  author?: User | null;
  author_name: string | null;
}

/** Content-type `api::deployment.deployment` — Mises en ligne : un enregistrement par job de build */
export interface Deployment extends StrapiDocument {
  site?: Site | null;
  job_id: string | null;
  deployment_id: string | null;
  status: DeploymentStatus;
  reason: DeploymentReason | null;
  step: DeploymentStep | null;
  reference: string | null;
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
  blocks?: Array<DynamicZoneEntry<'blocks.text', BlocksText> | DynamicZoneEntry<'blocks.image', BlocksImage> | DynamicZoneEntry<'blocks.buttons', BlocksButtons> | DynamicZoneEntry<'blocks.callout', BlocksCallout> | DynamicZoneEntry<'blocks.documents', BlocksDocuments> | DynamicZoneEntry<'blocks.gallery', BlocksGallery> | DynamicZoneEntry<'blocks.faq', BlocksFaq> | DynamicZoneEntry<'blocks.contact', BlocksContact> | DynamicZoneEntry<'blocks.video', BlocksVideo>>;
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
  folder: string | null;
  uploaded_by_name: string | null;
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
  unsubscribed_at: string | null;
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
  lead: string | null;
  blocks?: Array<DynamicZoneEntry<'blocks.text', BlocksText> | DynamicZoneEntry<'blocks.image', BlocksImage> | DynamicZoneEntry<'blocks.buttons', BlocksButtons> | DynamicZoneEntry<'blocks.callout', BlocksCallout> | DynamicZoneEntry<'blocks.documents', BlocksDocuments> | DynamicZoneEntry<'blocks.gallery', BlocksGallery> | DynamicZoneEntry<'blocks.faq', BlocksFaq> | DynamicZoneEntry<'blocks.contact', BlocksContact> | DynamicZoneEntry<'blocks.video', BlocksVideo>>;
  meta_description: string | null;
  featured_image?: Media | null;
  scheduled_at: string | null;
  seo_keywords: string | null;
  site?: Site | null;
}

/** Content-type `api::pending-change.pending-change` — Modifications visibles sur le site public, en attente de la prochaine mise en ligne réussie */
export interface PendingChange extends StrapiDocument {
  site?: Site | null;
  content_type: string;
  content_document_id: string;
  title: string | null;
  action: PendingChangeAction;
  source: PendingChangeSource;
  author?: User | null;
  occurred_at: string;
}

/** Content-type `api::quote.quote` — Devis et bon de commande de l'abonnement Communeo, validés en ligne par la commune (#312) */
export interface Quote extends StrapiDocument {
  site?: Site | null;
  number: string;
  status: QuoteStatus;
  commune_name: string;
  code_insee: string | null;
  siret: string;
  address: string;
  billing_email: string;
  population: number;
  tier_label: string;
  amount_ht: string;
  vat_rate: string;
  amount_ttc: string;
  signatory_name: string;
  signatory_role: string;
  signed_at: string;
  pdf_sha256: string | null;
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

/** Content-type `api::signup-request.signup-request` — Inscription d'une mairie en libre-service, en attente de la confirmation envoyée à l'adresse officielle de la mairie ou de la vérification par l'équipe */
export interface SignupRequest extends StrapiDocument {
  code_insee: string;
  commune_name: string;
  first_name: string;
  last_name: string;
  status: SignupRequestStatus;
  terms_accepted_at: string;
  confirmed_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  site?: Site | null;
}

/** Content-type `api::site.site` */
export interface Site extends StrapiDocument {
  name: string;
  slug: string;
  theme: SiteTheme;
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
  suspended: boolean | null;
  plan: SitePlan | null;
  trial_ends_at: string | null;
  trial_expired_at: string | null;
  trial_notice: SiteTrialNotice | null;
  live_requested_at: string | null;
  onboarding: JsonValue | null;
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
  homepage?: HomepageHomepage | null;
  auto_deploy_enabled: boolean | null;
  auto_deploy_delay: number | null;
  waste_notes: string | null;
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
  title: string | null;
  delegation: string | null;
  bio: string | null;
  email: string | null;
  office_hours: string | null;
  photo?: Media | null;
  display_order: number | null;
  site?: Site | null;
}

/** Content-type `api::waste-schedule.waste-schedule` — Planning de collecte des dechets par type et jour */
export interface WasteSchedule extends StrapiDocument {
  waste_type: WasteScheduleWasteType;
  collection_day: WasteScheduleCollectionDay | null;
  frequency: WasteScheduleFrequency;
  month_rank: number | null;
  season_start_month: number | null;
  season_end_month: number | null;
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
  last_login_at: string | null;
}

/** Nom pluriel de chaque content-type, utilisé dans les routes REST (`/api/<pluralName>`) */
export const pluralNames = {
  'api::activity-log.activity-log': 'activity-logs',
  'api::alerte.alerte': 'alertes',
  'api::article.article': 'articles',
  'api::association.association': 'associations',
  'api::contact-submission.contact-submission': 'contact-submissions',
  'api::content-version.content-version': 'content-versions',
  'api::deployment.deployment': 'deployments',
  'api::evenement.evenement': 'evenements',
  'api::media-item.media-item': 'media-items',
  'api::newsletter-subscriber.newsletter-subscriber': 'newsletter-subscribers',
  'api::official-document.official-document': 'official-documents',
  'api::page.page': 'pages',
  'api::pending-change.pending-change': 'pending-changes',
  'api::quote.quote': 'quotes',
  'api::school-menu.school-menu': 'school-menus',
  'api::signup-request.signup-request': 'signup-requests',
  'api::site.site': 'sites',
  'api::team-member.team-member': 'team-members',
  'api::waste-schedule.waste-schedule': 'waste-schedules',
} as const;

export type ContentTypeUid = keyof typeof pluralNames;

export interface ContentTypes {
  'api::activity-log.activity-log': ActivityLog;
  'api::alerte.alerte': Alerte;
  'api::article.article': Article;
  'api::association.association': Association;
  'api::contact-submission.contact-submission': ContactSubmission;
  'api::content-version.content-version': ContentVersion;
  'api::deployment.deployment': Deployment;
  'api::evenement.evenement': Evenement;
  'api::media-item.media-item': MediaItem;
  'api::newsletter-subscriber.newsletter-subscriber': NewsletterSubscriber;
  'api::official-document.official-document': OfficialDocument;
  'api::page.page': Page;
  'api::pending-change.pending-change': PendingChange;
  'api::quote.quote': Quote;
  'api::school-menu.school-menu': SchoolMenu;
  'api::signup-request.signup-request': SignupRequest;
  'api::site.site': Site;
  'api::team-member.team-member': TeamMember;
  'api::waste-schedule.waste-schedule': WasteSchedule;
  'plugin::users-permissions.user': User;
}

export interface Components {
  'block-parts.button': BlockPartsButton;
  'block-parts.faq-item': BlockPartsFaqItem;
  'blocks.buttons': BlocksButtons;
  'blocks.callout': BlocksCallout;
  'blocks.contact': BlocksContact;
  'blocks.documents': BlocksDocuments;
  'blocks.faq': BlocksFaq;
  'blocks.gallery': BlocksGallery;
  'blocks.image': BlocksImage;
  'blocks.text': BlocksText;
  'blocks.video': BlocksVideo;
  'home-sections.free-content': HomeSectionsFreeContent;
  'home-sections.hero': HomeSectionsHero;
  'home-sections.key-figures': HomeSectionsKeyFigures;
  'home-sections.listing': HomeSectionsListing;
  'home-sections.mayor-word': HomeSectionsMayorWord;
  'home-sections.partners': HomeSectionsPartners;
  'home-sections.quick-links': HomeSectionsQuickLinks;
  'home-sections.toggle': HomeSectionsToggle;
  'homepage.homepage': HomepageHomepage;
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
