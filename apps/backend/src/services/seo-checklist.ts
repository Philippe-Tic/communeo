/**
 * Référencement au passage sur le domaine (#336) : les trois liens vers le site officiel que seule la
 * mairie peut mettre à jour (Annuaire de l'administration, fiche Google, Wikipédia). L'Annuaire et
 * Wikidata sont vérifiés en direct (mis en cache 30 minutes) ; la commune coche ce qu'elle a fait.
 * Un e-mail aux administrateurs donne la liste au moment où le domaine de la commune est vérifié.
 */
import { SEO_CHECKLIST_IDS, seoChecklist, type SeoChecklistId, type SeoChecklistItem } from '@communeo/core';
import { townHallListing, wikidataCommune } from './public-data';
import { notifyAdmins } from './trial';
import { log } from '../utils/logger';

const SITE = 'api::site.site';
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; value: Pick<Parameters<typeof seoChecklist>[0], 'annuaire' | 'wikidata'> }>();

/** Adresse publique du site : domaine de la commune une fois vérifié, sinon son adresse Communeo */
const siteUrlOf = (site: any): string | null => (typeof site.live_url === 'string' && site.live_url ? site.live_url.replace(/\/$/, '') : null);

async function external(site: any, refresh: boolean) {
  const key = `${site.documentId}:${site.code_insee}`;
  const cached = cache.get(key);
  if (cached && !refresh && Date.now() - cached.at < CACHE_MS) return cached.value;
  const [annuaire, wikidata] = await Promise.all([
    site.code_insee ? townHallListing(site.code_insee, site.name).catch(() => null) : Promise.resolve(null),
    site.code_insee ? wikidataCommune(site.code_insee).catch(() => null) : Promise.resolve(null),
  ]);
  const value = { annuaire, wikidata };
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Liste de contrôle d'une commune ; `null` tant que le site n'est pas publié */
export async function checklistOf(site: any, { refresh = false } = {}): Promise<{ siteUrl: string; items: SeoChecklistItem[] } | null> {
  const siteUrl = siteUrlOf(site);
  if (!siteUrl) return null;
  const { annuaire, wikidata } = await external(site, refresh);
  return {
    siteUrl,
    items: seoChecklist({ siteUrl, communeName: site.name, annuaire, wikidata, declared: (site.seo_checklist ?? {}) as Record<string, string> }),
  };
}

/** La commune déclare une démarche faite (ou non) */
export async function declare(site: any, id: SeoChecklistId, done: boolean) {
  if (!SEO_CHECKLIST_IDS.includes(id)) throw new Error(`Démarche inconnue : ${id}`);
  const declared = { ...((site.seo_checklist ?? {}) as Record<string, string>) };
  if (done) declared[id] = new Date().toISOString();
  else delete declared[id];
  await strapi.db.query(SITE).update({ where: { id: site.id }, data: { seo_checklist: declared } });
  return { ...site, seo_checklist: declared };
}

/** Domaine de la commune vérifié : la liste des trois démarches, avec les liens directs */
export async function sendChecklistEmail(siteDocumentId: string) {
  try {
    const site: any = await strapi.db.query(SITE).findOne({ where: { documentId: siteDocumentId } });
    const checklist = site && (await checklistOf(site, { refresh: true }));
    if (!checklist) return;
    const todo = checklist.items.filter((item) => item.state !== 'verified');
    if (!todo.length) return;
    await notifyAdmins(
      site,
      `Votre site est en ligne sur ${new URL(checklist.siteUrl).host} : ${todo.length} démarche${todo.length > 1 ? 's' : ''} pour être bien trouvé — Communeo`,
      [
        `Le site de ${site.name} est en ligne à l'adresse ${checklist.siteUrl}. Pour que les habitants le trouvent facilement, indiquez cette adresse là où ils la cherchent :`,
        ...todo.map((item, index) => `${index + 1}. ${item.title} : ${item.why} ${item.links.map((link) => `${link.label} : ${link.href}`).join(' · ')}`),
        "L'écran Mise en ligne de l'administration suit ces démarches et vérifie automatiquement l'Annuaire et Wikipédia.",
      ],
      { label: 'Ouvrir la mise en ligne', path: '/mise-en-ligne' },
    );
  } catch (error) {
    log.error('[RÉFÉRENCEMENT] E-mail de la liste de contrôle non envoyé :', error);
  }
}
