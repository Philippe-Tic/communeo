import type { Schema, Struct } from '@strapi/strapi';

export interface HomepageHomepageConfig extends Struct.ComponentSchema {
  collectionName: 'components_homepage_homepage_configs';
  info: {
    description: "Configuration compl\u00E8te de la page d'accueil du site";
    displayName: "Configuration page d'accueil";
  };
  attributes: {
    articles_count: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<3>;
    associations_count: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 12;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<6>;
    content: Schema.Attribute.RichText;
    events_count: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 6;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<3>;
    hero_cta_primary_label: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    hero_cta_primary_url: Schema.Attribute.String;
    hero_cta_secondary_label: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    hero_cta_secondary_url: Schema.Attribute.String;
    hero_image: Schema.Attribute.Media<'images'>;
    hero_subtitle: Schema.Attribute.Text;
    hero_title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    key_figures: Schema.Attribute.Component<'homepage.key-figure', true>;
    mayor_word_content: Schema.Attribute.RichText;
    mayor_word_title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    meta_description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160;
      }>;
    partners: Schema.Attribute.Component<'homepage.partner', true>;
    quick_links: Schema.Attribute.Component<'homepage.quick-link', true>;
    show_articles: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    show_associations: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    show_events: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    show_key_figures: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    show_mayor_word: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    show_partners: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    show_quick_links: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    show_weather: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface HomepageKeyFigure extends Struct.ComponentSchema {
  collectionName: 'components_homepage_key_figures';
  info: {
    description: "Chiffre cl\u00E9 pour la page d'accueil";
    displayName: 'Chiffre cl\u00E9';
  };
  attributes: {
    icon: Schema.Attribute.Enumeration<
      [
        'users',
        'map',
        'building',
        'calendar',
        'heart',
        'book',
        'globe',
        'shield',
        'tree',
        'star',
      ]
    > &
      Schema.Attribute.DefaultTo<'users'>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
  };
}

export interface HomepagePartner extends Struct.ComponentSchema {
  collectionName: 'components_homepage_partners';
  info: {
    description: "Partenaire affich\u00E9 sur la page d'accueil";
    displayName: 'Partenaire';
  };
  attributes: {
    logo: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    url: Schema.Attribute.String;
  };
}

export interface HomepageQuickLink extends Struct.ComponentSchema {
  collectionName: 'components_homepage_quick_links';
  info: {
    description: "Lien d'acc\u00E8s rapide pour la page d'accueil";
    displayName: 'Lien rapide';
  };
  attributes: {
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    icon: Schema.Attribute.Enumeration<
      [
        'document',
        'identity',
        'folder',
        'mail',
        'alert',
        'clock',
        'phone',
        'map',
        'calendar',
        'users',
        'building',
        'heart',
        'info',
        'shield',
        'book',
        'globe',
      ]
    > &
      Schema.Attribute.DefaultTo<'document'>;
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LegalAccessibilite extends Struct.ComponentSchema {
  collectionName: 'components_legal_accessibilite';
  info: {
    description: "D\u00E9claration d'accessibilit\u00E9 RGAA";
    displayName: 'Accessibilit\u00E9';
  };
  attributes: {
    accessibility_action_plan_url: Schema.Attribute.String;
    accessibility_declaration: Schema.Attribute.RichText;
    accessibility_level: Schema.Attribute.Enumeration<
      ['non-conforme', 'partiellement-conforme', 'conforme']
    > &
      Schema.Attribute.DefaultTo<'non-conforme'>;
    accessibility_schema_url: Schema.Attribute.String;
  };
}

export interface LegalDemarchesIdentite extends Struct.ComponentSchema {
  collectionName: 'components_legal_demarches_identite';
  info: {
    description: 'Configuration CNI et Passeport';
    displayName: 'D\u00E9marches identit\u00E9';
  };
  attributes: {
    appointment_provider: Schema.Attribute.Enumeration<
      ['synbird', 'ants-rdv', 'rdv-service-public', 'autre']
    > &
      Schema.Attribute.DefaultTo<'ants-rdv'>;
    appointment_url: Schema.Attribute.String;
    has_dispositif_recueil: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    remise_titre_info: Schema.Attribute.Text;
  };
}

export interface LegalInfosPratiques extends Struct.ComponentSchema {
  collectionName: 'components_legal_infos_pratiques';
  info: {
    description: "Horaires d'ouverture et informations pratiques";
    displayName: 'Infos pratiques';
  };
  attributes: {
    contact_form_intro: Schema.Attribute.Text;
    latitude: Schema.Attribute.Float;
    longitude: Schema.Attribute.Float;
    opening_hours: Schema.Attribute.JSON;
    population: Schema.Attribute.Integer;
  };
}

export interface LegalMentionsLegales extends Struct.ComponentSchema {
  collectionName: 'components_legal_mentions_legales';
  info: {
    description: 'Informations l\u00E9gales obligatoires (LCEN)';
    displayName: 'Mentions l\u00E9gales';
  };
  attributes: {
    credits: Schema.Attribute.RichText;
    hebergeur_address: Schema.Attribute.String;
    hebergeur_name: Schema.Attribute.String;
    hebergeur_phone: Schema.Attribute.String;
    mentions_legales_extra: Schema.Attribute.RichText;
    publication_director: Schema.Attribute.String;
    publication_director_title: Schema.Attribute.String;
    siret: Schema.Attribute.String;
  };
}

export interface LegalRgpd extends Struct.ComponentSchema {
  collectionName: 'components_legal_rgpd';
  info: {
    description: 'Politique de confidentialit\u00E9 et DPO';
    displayName: 'RGPD';
  };
  attributes: {
    dpo_email: Schema.Attribute.Email;
    dpo_name: Schema.Attribute.String;
    dpo_phone: Schema.Attribute.String;
    rgpd_policy: Schema.Attribute.RichText;
  };
}

export interface SocialSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_social_social_links';
  info: {
    description: 'Lien vers un r\u00E9seau social avec ic\u00F4ne';
    displayName: 'Lien r\u00E9seau social';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images'>;
    label: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    platform: Schema.Attribute.Enumeration<
      ['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'autre']
    > &
      Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'homepage.homepage-config': HomepageHomepageConfig;
      'homepage.key-figure': HomepageKeyFigure;
      'homepage.partner': HomepagePartner;
      'homepage.quick-link': HomepageQuickLink;
      'legal.accessibilite': LegalAccessibilite;
      'legal.demarches-identite': LegalDemarchesIdentite;
      'legal.infos-pratiques': LegalInfosPratiques;
      'legal.mentions-legales': LegalMentionsLegales;
      'legal.rgpd': LegalRgpd;
      'social.social-link': SocialSocialLink;
    }
  }
}
