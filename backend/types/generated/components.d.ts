import type { Schema, Struct } from '@strapi/strapi';

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

export interface LegalInfosPratiques extends Struct.ComponentSchema {
  collectionName: 'components_legal_infos_pratiques';
  info: {
    description: "Horaires d'ouverture et informations pratiques";
    displayName: 'Infos pratiques';
  };
  attributes: {
    contact_form_intro: Schema.Attribute.Text;
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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'legal.accessibilite': LegalAccessibilite;
      'legal.infos-pratiques': LegalInfosPratiques;
      'legal.mentions-legales': LegalMentionsLegales;
      'legal.rgpd': LegalRgpd;
    }
  }
}
