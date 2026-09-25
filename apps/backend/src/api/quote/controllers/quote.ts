/**
 * Devis de l'abonnement Communeo (#312), validé en ligne par la commune.
 *
 * GET  /api/quote        → offre (population INSEE, tranche, montants), coordonnées de facturation
 *                           connues, dernier devis de la commune
 * GET  /api/quote/draft  → projet de devis en PDF (?siret=&address=&billingEmail= : saisie en cours)
 * POST /api/quote/sign   → { siret, address, billingEmail, signatoryName, signatoryRole, accept: true }
 *   Administrateurs de la commune. Le devis validé (numéroté, signataire, heure, adresse IP) est archivé
 *   en PDF ; il vaut demande de passage en live : l'équipe Communeo le valide (file « À valider »), puis
 *   la commune passe en live sans attendre le paiement.
 * GET  /api/quote/:documentId/pdf → le devis validé (commune concernée ou équipe Communeo)
 */
import {
  isValidSiret,
  pricingTier,
  quoteAmounts,
  tierLabel,
  formatEuros,
} from '@communeo/core';
import { recordActivity } from '../../../services/activity-log';
import { communePopulation, PublicDataUnavailable } from '../../../services/public-data';
import { renderQuotePdf, sha256, type QuoteContent, type QuoteIssuer } from '../../../services/quote-pdf';
import { adminUrl, notifyTeam } from '../../../services/team-notifications';
import { getEffectiveSite, hasRole } from '../../../utils/getEffectiveSite';

const SITE = 'api::site.site';
const QUOTE = 'api::quote.quote';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TEXT = 300;

const issuer = (): QuoteIssuer & { vatRate: number } => {
  const config = strapi.config.get('platform.issuer', {}) as Partial<QuoteIssuer & { vatRate: number }>;
  return { name: config.name ?? '', address: config.address ?? '', siret: config.siret ?? '', email: config.email ?? '', vatRate: config.vatRate ?? 0 };
};

/** La commune de la requête, avec ses mentions légales (SIRET) ; répond et renvoie null sinon */
async function communeOf(ctx) {
  // Équipe Communeo : un lien vers le PDF ne porte pas l'en-tête d'impersonation, d'où ?site=
  const teamSite = hasRole(ctx, ['super_admin']) && typeof ctx.query?.site === 'string' ? { documentId: ctx.query.site } : null;
  const effective = teamSite ?? (await getEffectiveSite(ctx));
  if (!effective) {
    ctx.forbidden('Aucun site assigné à ce compte');
    return null;
  }
  const site: any = await strapi.db.query(SITE).findOne({ where: { documentId: effective.documentId }, populate: ['mentions_legales'] });
  if (!site) ctx.notFound('Site non trouvé');
  return site;
}

/** Tranche et montants d'après la population INSEE ; répond et renvoie null si elle est inconnue */
async function offerFor(ctx, site: any) {
  if (!site.code_insee) {
    ctx.conflict("Le code INSEE de la commune n'est pas connu : contactez l'équipe Communeo pour votre devis.");
    return null;
  }
  let population: number | null;
  try {
    population = await communePopulation(site.code_insee);
  } catch (error) {
    if (!(error instanceof PublicDataUnavailable)) throw error;
    ctx.status = 502;
    ctx.body = { data: null, error: { status: 502, name: 'BadGatewayError', message: "La population INSEE n'a pas pu être lue : réessayez dans quelques minutes." } };
    return null;
  }
  if (population === null) {
    ctx.conflict("La population INSEE de la commune est introuvable : contactez l'équipe Communeo pour votre devis.");
    return null;
  }
  const tier = pricingTier(population);
  return { population, tierLabel: tierLabel(tier), amounts: quoteAmounts(tier.annualHT, issuer().vatRate) };
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const summary = (quote: any) =>
  quote && {
    documentId: quote.documentId,
    number: quote.number,
    status: quote.status,
    signedAt: quote.signed_at,
    signatoryName: quote.signatory_name,
    signatoryRole: quote.signatory_role,
    amountHT: Number(quote.amount_ht),
    amountTTC: Number(quote.amount_ttc),
  };

/** Dernier devis de la commune */
export const latestQuote = (siteDocumentId: string) =>
  strapi.db.query(QUOTE).findOne({ where: { site: { documentId: siteDocumentId } }, orderBy: { signed_at: 'desc' } });

/** DEV-2026-0001 : numérotation annuelle, sans trou */
async function nextNumber(now: Date): Promise<string> {
  const year = now.getFullYear();
  const count = await strapi.db.query(QUOTE).count({ where: { number: { $startsWith: `DEV-${year}-` } } });
  return `DEV-${year}-${String(count + 1).padStart(4, '0')}`;
}

export default {
  async offer(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    const offer = await offerFor(ctx, site);
    if (!offer) return;
    ctx.body = {
      data: {
        commune: {
          name: site.name,
          insee: site.code_insee,
          siret: site.mentions_legales?.siret ?? null,
          address: site.address ?? null,
          billingEmail: site.contact_mail ?? null,
        },
        offer,
        quote: summary(await latestQuote(site.documentId)),
      },
    };
  },

  async draft(ctx) {
    const site = await communeOf(ctx);
    if (!site) return;
    const offer = await offerFor(ctx, site);
    if (!offer) return;
    const content: QuoteContent = {
      date: new Date(),
      communeName: site.name,
      codeInsee: site.code_insee ?? null,
      siret: text(ctx.query.siret) || site.mentions_legales?.siret || '[SIRET]',
      address: text(ctx.query.address) || site.address || '[adresse de la mairie]',
      billingEmail: text(ctx.query.billingEmail) || site.contact_mail || '[e-mail de facturation]',
      population: offer.population,
      tierLabel: offer.tierLabel,
      amounts: offer.amounts,
    };
    ctx.type = 'application/pdf';
    ctx.set('Content-Disposition', 'inline; filename="projet-de-devis-communeo.pdf"');
    ctx.set('Cache-Control', 'no-store');
    ctx.body = await renderQuotePdf(issuer(), content);
  },

  async sign(ctx) {
    if (!hasRole(ctx, ['admin', 'super_admin'])) return ctx.forbidden('Seul un administrateur de la commune peut valider le devis.');
    const site = await communeOf(ctx);
    if (!site) return;
    if ((site.plan ?? 'live') === 'live') return ctx.conflict('Ce site est déjà en live.');
    const pending = await latestQuote(site.documentId);
    if (pending?.status === 'signed') return ctx.conflict(`Le devis ${pending.number} attend déjà la validation de l'équipe Communeo.`);

    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const input = {
      siret: text(body.siret).replace(/\s/g, ''),
      address: text(body.address),
      billingEmail: text(body.billingEmail).toLowerCase(),
      signatoryName: text(body.signatoryName),
      signatoryRole: text(body.signatoryRole),
    };
    const errors = [
      !isValidSiret(input.siret) && 'SIRET invalide : 14 chiffres, tel qu’il figure sur l’avis de situation INSEE.',
      !input.address && 'Indiquez l’adresse de la mairie.',
      !EMAIL.test(input.billingEmail) && 'Indiquez l’e-mail qui recevra les factures.',
      !input.signatoryName && 'Indiquez le nom du signataire.',
      !input.signatoryRole && 'Indiquez la qualité du signataire.',
      Object.values(input).some((value) => value.length > MAX_TEXT) && 'Un champ dépasse 300 caractères.',
      body.accept !== true && 'Cochez la case pour accepter le devis et les conditions.',
    ].filter((error): error is string => !!error);
    if (errors.length) return ctx.badRequest(errors.join(' '), { errors });

    const offer = await offerFor(ctx, site);
    if (!offer) return;
    const user = ctx.state.user;
    const now = new Date();
    const number = await nextNumber(now);
    const signature = { name: input.signatoryName, role: input.signatoryRole, at: now, ip: ctx.request.ip, email: user.email };
    const pdf = await renderQuotePdf(issuer(), {
      number,
      date: now,
      communeName: site.name,
      codeInsee: site.code_insee ?? null,
      siret: input.siret,
      address: input.address,
      billingEmail: input.billingEmail,
      population: offer.population,
      tierLabel: offer.tierLabel,
      amounts: offer.amounts,
      signature,
    });

    const quote: any = await strapi.documents(QUOTE as any).create({
      data: {
        site: site.documentId,
        number,
        status: 'signed',
        commune_name: site.name,
        code_insee: site.code_insee,
        siret: input.siret,
        address: input.address,
        billing_email: input.billingEmail,
        population: offer.population,
        tier_label: offer.tierLabel,
        amount_ht: offer.amounts.ht,
        vat_rate: offer.amounts.vatRate,
        amount_ttc: offer.amounts.ttc,
        signatory_name: input.signatoryName,
        signatory_role: input.signatoryRole,
        signed_by_email: user.email,
        signed_at: now,
        signed_ip: ctx.request.ip,
        pdf: pdf.toString('base64'),
        pdf_sha256: sha256(pdf),
      } as any,
    });
    // Le devis validé vaut demande de passage en live, à valider par l'équipe
    await strapi.documents(SITE).update({
      documentId: site.documentId,
      data: { live_requested_at: now, live_requested_by: `${input.signatoryName}, ${input.signatoryRole} (${user.email})` } as any,
    });
    await recordActivity({
      action: 'quote_sign',
      siteDocumentId: site.documentId,
      target: { type: 'quote', id: quote.documentId, label: number },
      details: { amountHT: offer.amounts.ht, signatory: `${input.signatoryName}, ${input.signatoryRole}` },
    });
    await notifyTeam(
      `Devis validé : ${site.name} (${number})`,
      `${input.signatoryName}, ${input.signatoryRole}, a validé le devis ${number} de ${site.name} (INSEE ${site.code_insee}) : ${formatEuros(offer.amounts.ht)} HT par an, tranche : ${offer.tierLabel}. Passez la commune en live depuis la file « À valider » : ${adminUrl()}/plateforme/a-valider`,
    );
    ctx.body = { data: summary(quote) };
  },

  async pdf(ctx) {
    const quote: any = await strapi.db.query(QUOTE).findOne({ where: { documentId: ctx.params.documentId }, populate: ['site'] });
    if (!quote) return ctx.notFound('Devis introuvable');
    if (!hasRole(ctx, ['super_admin'])) {
      const effective = await getEffectiveSite(ctx);
      if (!effective || quote.site?.documentId !== effective.documentId) return ctx.notFound('Devis introuvable');
    }
    ctx.type = 'application/pdf';
    ctx.set('Content-Disposition', `inline; filename="devis-communeo-${quote.number}.pdf"`);
    ctx.set('Cache-Control', 'private, no-store');
    ctx.body = Buffer.from(quote.pdf, 'base64');
  },
};
