/**
 * Création d'une commune : le site, le site chez l'hébergeur et le premier administrateur, invité
 * (compte bloqué jusqu'au choix de son mot de passe). Partagée par l'espace équipe (#261) et
 * l'inscription en libre-service (#309).
 */
import crypto from 'crypto';
import { DEFAULT_THEME, slugify } from '@communeo/core';
import { log } from '../utils/logger';
import { publisher as getPublisher, toPublisherSite } from '../utils/publisher';
import { createInvitationToken } from '../utils/security';
import { trialStart } from './trial';

export interface NewCommune {
  name: string;
  /** Adresse du site ; générée depuis le nom si absente */
  slug?: string;
  codeInsee?: string | null;
  /** E-mail de contact de la mairie */
  contactMail: string;
  admin: { email: string; firstName: string; lastName: string };
  /** Inscription en libre-service : 30 jours d'essai (sinon, commune créée par l'équipe : en live) */
  trial?: boolean;
}

/** Adresse de site libre, depuis le nom de la commune (« saint-aubin », puis « saint-aubin-2 »…) */
export async function uniqueSiteSlug(name: string): Promise<string> {
  const base = slugify(name) || 'commune';
  for (let index = 1; ; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    if (!(await strapi.query('api::site.site').count({ where: { slug: candidate } }))) return candidate;
  }
}

export async function emailTaken(email: string): Promise<boolean> {
  return (await strapi.query('plugin::users-permissions.user').count({ where: { $or: [{ email }, { username: email }] } })) > 0;
}

/** Crée la commune et son administrateur ; renvoie le jeton d'invitation (à envoyer par e-mail) */
export async function createCommune(input: NewCommune): Promise<{ site: any; invitationToken: string }> {
  const slug = input.slug ?? (await uniqueSiteSlug(input.name));
  const email = input.admin.email.trim().toLowerCase();

  // 1. La commune ; l'assistant de création attend le premier administrateur (étape 1)
  const site = await strapi.documents('api::site.site').create({
    data: {
      name: input.name,
      slug,
      theme: DEFAULT_THEME,
      contact_mail: input.contactMail,
      ...(input.codeInsee ? { code_insee: input.codeInsee } : {}),
      onboarding: { step: 1 },
      ...(input.trial ? trialStart() : { plan: 'live' }),
    } as any,
  });

  // 2. Le site chez l'hébergeur (sinon créé à la première mise en ligne)
  const publisher = getPublisher();
  if (publisher.configured) {
    try {
      const host = await publisher.ensureSite(toPublisherSite(site));
      await strapi.documents('api::site.site').update({ documentId: site.documentId, data: { netlify_site_id: host.hostId, live_url: host.defaultUrl } as any });
    } catch (error) {
      log.error('Failed to create host site:', error);
    }
  }

  // 3. Le premier administrateur, invité
  const userService = strapi.plugin('users-permissions').service('user');
  const hashed = (await userService.ensureHashedPasswords({ password: crypto.randomBytes(32).toString('hex') })).password;
  const { token, stored } = createInvitationToken();
  const authenticated = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
  await strapi.query('plugin::users-permissions.user').create({
    data: {
      username: email,
      email,
      password: hashed,
      first_name: input.admin.firstName,
      last_name: input.admin.lastName,
      municipality_role: 'admin',
      active: true,
      confirmed: true,
      blocked: true,
      provider: 'local',
      role: authenticated.id,
      site: site.id,
      resetPasswordToken: stored,
    },
  });

  return { site, invitationToken: token };
}
