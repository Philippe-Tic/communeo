import type { Schema, Struct } from '@strapi/strapi';

export interface BlockPartsButton extends Struct.ComponentSchema {
  collectionName: 'components_block_parts_buttons';
  info: {
    description: 'Un bouton du bloc Bouton / lien';
    displayName: 'Bouton';
    icon: 'cursor';
  };
  attributes: {
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60;
      }>;
    style: Schema.Attribute.Enumeration<['primary', 'secondary']> & Schema.Attribute.DefaultTo<'primary'>;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BlockPartsFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_block_parts_faq_items';
  info: {
    description: 'Une paire question / r\u00E9ponse';
    displayName: 'Question / r\u00E9ponse';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.JSON & Schema.Attribute.Required;
    question: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
  };
}

export interface BlocksButtons extends Struct.ComponentSchema {
  collectionName: 'components_blocks_buttonss';
  info: {
    description: '1 \u00E0 3 boutons vers une page ou un site';
    displayName: 'Bouton / lien';
    icon: 'cursor';
  };
  attributes: {
    buttons: Schema.Attribute.Component<'block-parts.button', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 3;
          min: 1;
        },
        number
      >;
  };
}

export interface BlocksCallout extends Struct.ComponentSchema {
  collectionName: 'components_blocks_callouts';
  info: {
    description: 'Information, attention, important ou conseil';
    displayName: 'Encadr\u00E9';
    icon: 'information';
  };
  attributes: {
    body: Schema.Attribute.JSON & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    variant: Schema.Attribute.Enumeration<['info', 'warning', 'important', 'tip']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'info'>;
  };
}

export interface BlocksContact extends Struct.ComponentSchema {
  collectionName: 'components_blocks_contacts';
  info: {
    description: "Coordonn\u00E9es d'un lieu ou d'un service";
    displayName: 'Contact / lieu';
    icon: 'pinMap';
  };
  attributes: {
    address: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    email: Schema.Attribute.Email;
    hours: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
    phone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 30;
      }>;
    show_map: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface BlocksDocuments extends Struct.ComponentSchema {
  collectionName: 'components_blocks_documentss';
  info: {
    description: 'Liste de fichiers \u00E0 t\u00E9l\u00E9charger';
    displayName: 'Documents \u00E0 t\u00E9l\u00E9charger';
    icon: 'file';
  };
  attributes: {
    files: Schema.Attribute.Media<'files' | 'images', true> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface BlocksFaq extends Struct.ComponentSchema {
  collectionName: 'components_blocks_faqs';
  info: {
    description: 'Questions fr\u00E9quentes en accord\u00E9on';
    displayName: 'Questions / r\u00E9ponses';
    icon: 'question';
  };
  attributes: {
    items: Schema.Attribute.Component<'block-parts.faq-item', true> &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface BlocksGallery extends Struct.ComponentSchema {
  collectionName: 'components_blocks_gallerys';
  info: {
    description: '3 \u00E0 12 images';
    displayName: 'Galerie';
    icon: 'landscape';
  };
  attributes: {
    images: Schema.Attribute.Media<'images', true> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 120;
      }>;
  };
}

export interface BlocksImage extends Struct.ComponentSchema {
  collectionName: 'components_blocks_images';
  info: {
    description: 'Une image avec l\u00E9gende';
    displayName: 'Image';
    icon: 'picture';
  };
  attributes: {
    caption: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    width: Schema.Attribute.Enumeration<['normal', 'full']> & Schema.Attribute.DefaultTo<'normal'>;
  };
}

export interface BlocksText extends Struct.ComponentSchema {
  collectionName: 'components_blocks_texts';
  info: {
    description: 'Titres, paragraphes, listes, gras, italique et liens';
    displayName: 'Texte';
    icon: 'align-left';
  };
  attributes: {
    body: Schema.Attribute.JSON & Schema.Attribute.Required;
  };
}

export interface BlocksVideo extends Struct.ComponentSchema {
  collectionName: 'components_blocks_videos';
  info: {
    description: 'Vid\u00E9o YouTube, Dailymotion ou Vimeo';
    displayName: 'Vid\u00E9o';
    icon: 'play';
  };
  attributes: {
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    transcript: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20000;
      }>;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

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
    show_associations: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    show_disruptions: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    show_events: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    show_key_figures: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    show_mayor_word: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    show_newsletter: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    show_partners: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    show_quick_links: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    show_school_menu: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    show_waste_collection: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
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
      ['users', 'map', 'building', 'calendar', 'heart', 'book', 'globe', 'shield', 'tree', 'star']
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
    accessibility_level: Schema.Attribute.Enumeration<['non-conforme', 'partiellement-conforme', 'conforme']> &
      Schema.Attribute.DefaultTo<'non-conforme'>;
    accessibility_schema_url: Schema.Attribute.String;
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

export interface SchoolMenuMeal extends Struct.ComponentSchema {
  collectionName: 'components_school_menu_meals';
  info: {
    description: "Repas d'une journ\u00E9e de cantine scolaire";
    displayName: 'Repas';
  };
  attributes: {
    dairy: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    day: Schema.Attribute.Enumeration<['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']> & Schema.Attribute.Required;
    dessert: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    labels: Schema.Attribute.JSON;
    main_course: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    side_dish: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    snack: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    starter: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
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
    platform: Schema.Attribute.Enumeration<['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'autre']> &
      Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
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
  }
}
