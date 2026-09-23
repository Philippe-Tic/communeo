import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::api-token-permission'>;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token-permission'> & Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> & Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    deviceId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> & Schema.Attribute.Private;
    origin: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private & Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    userId: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::transfer-token'> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::transfer-token-permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::transfer-token-permission'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.Private & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.Private & Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> & Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAlerteAlerte extends Struct.CollectionTypeSchema {
  collectionName: 'alertes';
  info: {
    description: "Alertes et bandeaux d'urgence affich\u00E9s en haut du site";
    displayName: 'Alerte';
    pluralName: 'alertes';
    singularName: 'alerte';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    active: Schema.Attribute.Boolean & Schema.Attribute.Required & Schema.Attribute.DefaultTo<false>;
    affected_area: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    alert_type: Schema.Attribute.Enumeration<
      ['travaux', 'coupure-eau', 'coupure-electricite', 'deviation', 'intemperie', 'autre']
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    display_from: Schema.Attribute.DateTime;
    display_until: Schema.Attribute.DateTime;
    end_date: Schema.Attribute.Date;
    link_label: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    link_url: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::alerte.alerte'> & Schema.Attribute.Private;
    location: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    message: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    severity: Schema.Attribute.Enumeration<['info', 'warning', 'critical']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'info'>;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    start_date: Schema.Attribute.Date;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiArticleArticle extends Struct.CollectionTypeSchema {
  collectionName: 'articles';
  info: {
    description: 'News articles and posts';
    displayName: 'Article';
    pluralName: 'articles';
    singularName: 'article';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    author: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    blocks: Schema.Attribute.DynamicZone<
      [
        'blocks.text',
        'blocks.image',
        'blocks.buttons',
        'blocks.callout',
        'blocks.documents',
        'blocks.gallery',
        'blocks.faq',
        'blocks.contact',
        'blocks.video',
      ]
    >;
    category: Schema.Attribute.Enumeration<['news', 'event', 'information', 'emergency']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'news'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::article.article'> & Schema.Attribute.Private;
    meta_description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    publication_date: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    scheduled_at: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    slug: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    summary: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    view_count: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiAssociationAssociation extends Struct.CollectionTypeSchema {
  collectionName: 'associations';
  info: {
    description: 'Annuaire des associations de la commune';
    displayName: 'Association';
    pluralName: 'associations';
    singularName: 'association';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address: Schema.Attribute.Text;
    category: Schema.Attribute.Enumeration<['sport', 'culture', 'social', 'environnement', 'education', 'autre']> &
      Schema.Attribute.Required;
    contact_email: Schema.Attribute.Email;
    contact_name: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    contact_phone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::association.association'> & Schema.Attribute.Private;
    logo: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    rejection_reason: Schema.Attribute.Text;
    reviewed_at: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['pending', 'published', 'rejected']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    submission_source: Schema.Attribute.Enumeration<['manual', 'public_form']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'manual'>;
    submitted_by_email: Schema.Attribute.Email;
    submitted_by_name: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    website: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
  };
}

export interface ApiContactSubmissionContactSubmission extends Struct.CollectionTypeSchema {
  collectionName: 'contact_submissions';
  info: {
    displayName: 'Contact Submission';
    pluralName: 'contact-submissions';
    singularName: 'contact-submission';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acknowledged_at: Schema.Attribute.DateTime;
    acknowledgment_sent: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    attachments: Schema.Attribute.Media<'images' | 'files', true>;
    category: Schema.Attribute.Enumeration<
      ['general', 'urbanisme', 'etat-civil', 'voirie', 'associations', 'rgpd', 'autre']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'general'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    first_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    history: Schema.Attribute.JSON;
    last_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::contact-submission.contact-submission'> &
      Schema.Attribute.Private;
    message: Schema.Attribute.Text & Schema.Attribute.Required;
    opened_at: Schema.Attribute.DateTime;
    phone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    reference_number: Schema.Attribute.String & Schema.Attribute.Unique;
    responded_at: Schema.Attribute.DateTime;
    response: Schema.Attribute.RichText;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['received', 'in_progress', 'resolved', 'closed']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'received'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiDeploymentDeployment extends Struct.CollectionTypeSchema {
  collectionName: 'deployments';
  info: {
    description: 'Mises en ligne : un enregistrement par job de build';
    displayName: 'Deployment';
    pluralName: 'deployments';
    singularName: 'deployment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    build_time: Schema.Attribute.Integer;
    completed_at: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    deployment_id: Schema.Attribute.String & Schema.Attribute.Unique;
    deployment_url: Schema.Attribute.String;
    error_message: Schema.Attribute.Text;
    job_id: Schema.Attribute.String & Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::deployment.deployment'> & Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    reason: Schema.Attribute.Enumeration<['manual', 'content', 'scheduled', 'domain']> &
      Schema.Attribute.DefaultTo<'manual'>;
    reference: Schema.Attribute.String;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<['building', 'ready', 'error']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'building'>;
    step: Schema.Attribute.Enumeration<['checking', 'rendering', 'publishing', 'cache']>;
    triggered_at: Schema.Attribute.DateTime & Schema.Attribute.Required & Schema.Attribute.DefaultTo<'now'>;
    triggered_by: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiEvenementEvenement extends Struct.CollectionTypeSchema {
  collectionName: 'evenements';
  info: {
    description: 'Municipal events and activities';
    displayName: 'Evenement';
    pluralName: 'evenements';
    singularName: 'evenement';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    address: Schema.Attribute.Text;
    blocks: Schema.Attribute.DynamicZone<
      [
        'blocks.text',
        'blocks.image',
        'blocks.buttons',
        'blocks.callout',
        'blocks.documents',
        'blocks.gallery',
        'blocks.faq',
        'blocks.contact',
        'blocks.video',
      ]
    >;
    category: Schema.Attribute.Enumeration<['cultural', 'sport', 'meeting', 'celebration', 'workshop', 'conference']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'cultural'>;
    contact_email: Schema.Attribute.Email;
    contact_phone: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    end_date: Schema.Attribute.DateTime;
    external_link: Schema.Attribute.String;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    image: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::evenement.evenement'> & Schema.Attribute.Private;
    location: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    max_participants: Schema.Attribute.Integer;
    organizer: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    price: Schema.Attribute.String & Schema.Attribute.DefaultTo<'Free'>;
    publishedAt: Schema.Attribute.DateTime;
    registration_deadline: Schema.Attribute.DateTime;
    registration_required: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    scheduled_at: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    slug: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    start_date: Schema.Attribute.DateTime & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiMediaItemMediaItem extends Struct.CollectionTypeSchema {
  collectionName: 'media_items';
  info: {
    description: 'Biblioth\u00E8que de m\u00E9dias avec isolation par site';
    displayName: 'Media Item';
    pluralName: 'media-items';
    singularName: 'media-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    alt_text: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    caption: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'> & Schema.Attribute.Required;
    folder: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }> &
      Schema.Attribute.DefaultTo<'general'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::media-item.media-item'> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiNewsletterSubscriberNewsletterSubscriber extends Struct.CollectionTypeSchema {
  collectionName: 'newsletter_subscribers';
  info: {
    displayName: 'Newsletter Subscriber';
    pluralName: 'newsletter-subscribers';
    singularName: 'newsletter-subscriber';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    active: Schema.Attribute.Boolean & Schema.Attribute.Required & Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    first_name: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    last_name: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::newsletter-subscriber.newsletter-subscriber'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    subscribed_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    unsubscribe_token: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Private;
    unsubscribed_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiOfficialDocumentOfficialDocument extends Struct.CollectionTypeSchema {
  collectionName: 'official_documents';
  info: {
    description: 'Documents officiels des communes (PV, d\u00E9lib\u00E9rations, arr\u00EAt\u00E9s, budgets)';
    displayName: 'Official Document';
    pluralName: 'official-documents';
    singularName: 'official-document';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    additional_files: Schema.Attribute.Media<'files' | 'images', true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    document_date: Schema.Attribute.Date & Schema.Attribute.Required;
    document_type: Schema.Attribute.Enumeration<
      [
        'pv-conseil-municipal',
        'deliberation',
        'arrete',
        'plu',
        'scot',
        'carte-communale',
        'budget-primitif',
        'compte-administratif',
        'rapport-orientations-budgetaires',
        'autre',
      ]
    > &
      Schema.Attribute.Required;
    file: Schema.Attribute.Media<'files'> & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::official-document.official-document'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    reference_number: Schema.Attribute.String;
    scheduled_at: Schema.Attribute.DateTime;
    session_date: Schema.Attribute.Date;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    slug: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    year: Schema.Attribute.Integer & Schema.Attribute.Required;
  };
}

export interface ApiPagePage extends Struct.CollectionTypeSchema {
  collectionName: 'pages';
  info: {
    description: '';
    displayName: 'Page';
    pluralName: 'pages';
    singularName: 'page';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    blocks: Schema.Attribute.DynamicZone<
      [
        'blocks.text',
        'blocks.image',
        'blocks.buttons',
        'blocks.callout',
        'blocks.documents',
        'blocks.gallery',
        'blocks.faq',
        'blocks.contact',
        'blocks.video',
      ]
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    featured_image: Schema.Attribute.Media<'images'>;
    lead: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::page.page'> & Schema.Attribute.Private;
    meta_description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    scheduled_at: Schema.Attribute.DateTime;
    seo_keywords: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    slug: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiPendingChangePendingChange extends Struct.CollectionTypeSchema {
  collectionName: 'pending_changes';
  info: {
    description: 'Modifications visibles sur le site public, en attente de la prochaine mise en ligne r\u00E9ussie';
    displayName: 'Modification en attente';
    pluralName: 'pending-changes';
    singularName: 'pending-change';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.Enumeration<['publish', 'unpublish', 'delete', 'create', 'update']> &
      Schema.Attribute.Required;
    author: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.user'>;
    content_document_id: Schema.Attribute.String & Schema.Attribute.Required;
    content_type: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::pending-change.pending-change'> &
      Schema.Attribute.Private;
    occurred_at: Schema.Attribute.DateTime & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    source: Schema.Attribute.Enumeration<['person', 'scheduled']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'person'>;
    title: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiSchoolMenuSchoolMenu extends Struct.CollectionTypeSchema {
  collectionName: 'school_menus';
  info: {
    description: 'Menus de cantine scolaire par semaine';
    displayName: 'Menu cantine';
    pluralName: 'school-menus';
    singularName: 'school-menu';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::school-menu.school-menu'> & Schema.Attribute.Private;
    meals: Schema.Attribute.Component<'school-menu.meal', true>;
    menu_image: Schema.Attribute.Media<'images'>;
    menu_mode: Schema.Attribute.Enumeration<['image', 'manual']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'image'>;
    menu_pdf: Schema.Attribute.Media<'files'>;
    publishedAt: Schema.Attribute.DateTime;
    school_name: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    week_start: Schema.Attribute.Date & Schema.Attribute.Required;
  };
}

export interface ApiSiteSite extends Struct.CollectionTypeSchema {
  collectionName: 'sites';
  info: {
    description: '';
    displayName: 'Site';
    pluralName: 'sites';
    singularName: 'site';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    accessibilite: Schema.Attribute.Component<'legal.accessibilite', false>;
    address: Schema.Attribute.Text;
    alertes: Schema.Attribute.Relation<'oneToMany', 'api::alerte.alerte'>;
    articles: Schema.Attribute.Relation<'oneToMany', 'api::article.article'>;
    associations: Schema.Attribute.Relation<'oneToMany', 'api::association.association'>;
    auto_deploy_delay: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 3600;
          min: 60;
        },
        number
      > &
      Schema.Attribute.DefaultTo<300>;
    auto_deploy_enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    code_insee: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 5;
      }>;
    comarquage_audiences: Schema.Attribute.JSON;
    comarquage_enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    contact_mail: Schema.Attribute.Email & Schema.Attribute.Required;
    contact_phone: Schema.Attribute.String;
    contact_submissions: Schema.Attribute.Relation<'oneToMany', 'api::contact-submission.contact-submission'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    custom_domain: Schema.Attribute.String;
    deployments: Schema.Attribute.Relation<'oneToMany', 'api::deployment.deployment'>;
    domain_configured_at: Schema.Attribute.DateTime;
    domain_status: Schema.Attribute.Enumeration<['pending', 'verified', 'error']> &
      Schema.Attribute.DefaultTo<'pending'>;
    domain_type: Schema.Attribute.Enumeration<['apex', 'subdomain']>;
    evenements: Schema.Attribute.Relation<'oneToMany', 'api::evenement.evenement'>;
    favicon: Schema.Attribute.Media<'images'>;
    homepage: Schema.Attribute.Component<'homepage.homepage', false>;
    infos_pratiques: Schema.Attribute.Component<'legal.infos-pratiques', false>;
    live_url: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::site.site'> & Schema.Attribute.Private;
    logo: Schema.Attribute.Media<'images'>;
    media_items: Schema.Attribute.Relation<'oneToMany', 'api::media-item.media-item'>;
    mentions_legales: Schema.Attribute.Component<'legal.mentions-legales', false>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    navigation_config: Schema.Attribute.JSON;
    netlify_site_id: Schema.Attribute.String & Schema.Attribute.Private & Schema.Attribute.Unique;
    newsletter_subscribers: Schema.Attribute.Relation<'oneToMany', 'api::newsletter-subscriber.newsletter-subscriber'>;
    official_documents: Schema.Attribute.Relation<'oneToMany', 'api::official-document.official-document'>;
    open_data_enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    open_data_platform: Schema.Attribute.Enumeration<['data-gouv-fr', 'opendatasoft', 'custom', 'none']> &
      Schema.Attribute.DefaultTo<'none'>;
    open_data_url: Schema.Attribute.String;
    pages: Schema.Attribute.Relation<'oneToMany', 'api::page.page'>;
    publishedAt: Schema.Attribute.DateTime;
    rgpd: Schema.Attribute.Component<'legal.rgpd', false>;
    school_menus: Schema.Attribute.Relation<'oneToMany', 'api::school-menu.school-menu'>;
    slug: Schema.Attribute.UID<'name'> & Schema.Attribute.Required;
    social_links: Schema.Attribute.Component<'social.social-link', true>;
    ssl_enabled: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    team_members: Schema.Attribute.Relation<'oneToMany', 'api::team-member.team-member'>;
    theme: Schema.Attribute.Enumeration<['institutionnel', 'moderne', 'journal', 'bourg']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'institutionnel'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    waste_notes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    waste_schedules: Schema.Attribute.Relation<'oneToMany', 'api::waste-schedule.waste-schedule'>;
  };
}

export interface ApiTeamMemberTeamMember extends Struct.CollectionTypeSchema {
  collectionName: 'team_members';
  info: {
    description: 'Municipal team members';
    displayName: 'Team Member';
    pluralName: 'team-members';
    singularName: 'team-member';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    bio: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    delegation: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    display_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    email: Schema.Attribute.Email;
    first_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    last_name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::team-member.team-member'> & Schema.Attribute.Private;
    office_hours: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    photo: Schema.Attribute.Media<'images'>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Enumeration<['maire', 'adjoint', 'conseiller', 'dgs', 'agent']> & Schema.Attribute.Required;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 80;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface ApiWasteScheduleWasteSchedule extends Struct.CollectionTypeSchema {
  collectionName: 'waste_schedules';
  info: {
    description: 'Planning de collecte des dechets par type et jour';
    displayName: 'Collecte des dechets';
    pluralName: 'waste-schedules';
    singularName: 'waste-schedule';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    active: Schema.Attribute.Boolean & Schema.Attribute.Required & Schema.Attribute.DefaultTo<true>;
    collection_day: Schema.Attribute.Enumeration<
      ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    frequency: Schema.Attribute.Enumeration<
      [
        'hebdomadaire',
        'semaines-paires',
        'semaines-impaires',
        'bimensuel',
        'mensuel',
        'apport-volontaire',
        'sur-rendez-vous',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'hebdomadaire'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::waste-schedule.waste-schedule'> &
      Schema.Attribute.Private;
    month_rank: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    notes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    season_end_month: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 1;
        },
        number
      >;
    season_start_month: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 1;
        },
        number
      >;
    site: Schema.Attribute.Relation<'manyToOne', 'api::site.site'> & Schema.Attribute.Required;
    start_date: Schema.Attribute.Date;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    waste_type: Schema.Attribute.Enumeration<
      ['ordures-menageres', 'tri-selectif', 'verre', 'dechets-verts', 'encombrants']
    > &
      Schema.Attribute.Required;
    zone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
  };
}

export interface PluginContentReleasesRelease extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<'oneToMany', 'plugin::content-releases.release-action'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::content-releases.release'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<['ready', 'blocked', 'failed', 'done', 'empty']> & Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::content-releases.release-action'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<'manyToOne', 'plugin::content-releases.release'>;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::i18n.locale'> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON & Schema.Attribute.Required & Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::review-workflows.workflow'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<'oneToOne', 'plugin::review-workflows.workflow-stage'>;
    stages: Schema.Attribute.Relation<'oneToMany', 'plugin::review-workflows.workflow-stage'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::review-workflows.workflow-stage'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<'manyToOne', 'plugin::review-workflows.workflow'>;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> & Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'> & Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer & Schema.Attribute.Required & Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.permission'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'plugin::users-permissions.role'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.role'> & Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.permission'>;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.user'>;
  };
}

export interface PluginUsersPermissionsUser extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    first_name: Schema.Attribute.String & Schema.Attribute.Required;
    last_name: Schema.Attribute.String & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'plugin::users-permissions.user'> & Schema.Attribute.Private;
    municipality_role: Schema.Attribute.Enumeration<['super_admin', 'admin', 'editor']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'editor'>;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    phone: Schema.Attribute.String;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<'oneToOne', 'plugin::users-permissions.role'>;
    site: Schema.Attribute.Relation<'oneToOne', 'api::site.site'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> & Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::alerte.alerte': ApiAlerteAlerte;
      'api::article.article': ApiArticleArticle;
      'api::association.association': ApiAssociationAssociation;
      'api::contact-submission.contact-submission': ApiContactSubmissionContactSubmission;
      'api::deployment.deployment': ApiDeploymentDeployment;
      'api::evenement.evenement': ApiEvenementEvenement;
      'api::media-item.media-item': ApiMediaItemMediaItem;
      'api::newsletter-subscriber.newsletter-subscriber': ApiNewsletterSubscriberNewsletterSubscriber;
      'api::official-document.official-document': ApiOfficialDocumentOfficialDocument;
      'api::page.page': ApiPagePage;
      'api::pending-change.pending-change': ApiPendingChangePendingChange;
      'api::school-menu.school-menu': ApiSchoolMenuSchoolMenu;
      'api::site.site': ApiSiteSite;
      'api::team-member.team-member': ApiTeamMemberTeamMember;
      'api::waste-schedule.waste-schedule': ApiWasteScheduleWasteSchedule;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
