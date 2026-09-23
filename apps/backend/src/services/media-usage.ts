/**
 * « Utilisé dans N contenus » : où un fichier est utilisé. Strapi enregistre chaque lien fichier →
 * contenu dans `files_related_mph` (type, ligne, champ). Un fichier placé dans un composant (bloc
 * Image, logo d'un partenaire de l'accueil…) est rattaché au composant : on remonte les tables
 * `*_cmps` jusqu'au contenu qui le porte. Brouillon et version publiée d'un même document comptent
 * une seule fois.
 */

export interface MediaUsage {
  uid: string;
  documentId: string;
  /** « Page — Location de la salle des fêtes » */
  label: string;
  /** Écran de l'admin qui modifie ce contenu */
  path: string;
}

type Parent = { uid: string; id: number };

const DESCRIBE: Record<string, { type: string; title: (row: any) => string; path: (row: any) => string }> = {
  'api::page.page': { type: 'Page', title: (row) => row.title, path: (row) => `/pages/${row.document_id}` },
  'api::article.article': { type: 'Actualité', title: (row) => row.title, path: (row) => `/actualites/${row.document_id}` },
  'api::evenement.evenement': { type: 'Événement', title: (row) => row.title, path: (row) => `/agenda/${row.document_id}` },
  'api::official-document.official-document': { type: 'Document officiel', title: (row) => row.title, path: (row) => `/documents/${row.document_id}` },
  'api::team-member.team-member': { type: 'Équipe municipale', title: (row) => `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(), path: () => '/equipe' },
  'api::association.association': { type: 'Association', title: (row) => row.name, path: () => '/associations' },
  'api::school-menu.school-menu': { type: 'Cantine', title: (row) => `semaine du ${row.week_start}`, path: (row) => `/cantine?semaine=${row.week_start}` },
  'api::site.site': { type: 'Réglages du site', title: () => 'logo, page d’accueil ou réseaux sociaux', path: () => '/mon-site' },
};

/** Tables de liaison des composants : table `*_cmps` → type du parent (contenu ou composant) */
function componentLinks(strapi: any): Array<{ table: string; parentUid: string }> {
  const links: Array<{ table: string; parentUid: string }> = [];
  for (const [uid, meta] of strapi.db.metadata as Map<string, any>) {
    for (const attribute of Object.values<any>(meta.attributes ?? {})) {
      const table = attribute?.joinTable?.name;
      if (typeof table === 'string' && table.endsWith('_cmps') && !links.some((link) => link.table === table)) links.push({ table, parentUid: uid });
    }
  }
  return links;
}

async function parentsOf(strapi: any, links: Array<{ table: string; parentUid: string }>, component: Parent, depth = 0): Promise<Parent[]> {
  if (depth > 5) return [];
  const knex = strapi.db.connection;
  const found: Parent[] = [];
  for (const link of links) {
    const rows = await knex(link.table).select('entity_id').where({ component_type: component.uid, cmp_id: component.id });
    for (const row of rows) {
      const parent = { uid: link.parentUid, id: row.entity_id };
      const meta = strapi.db.metadata.get(link.parentUid);
      if (meta?.modelType === 'component' || !link.parentUid.includes('::')) found.push(...(await parentsOf(strapi, links, parent, depth + 1)));
      else found.push(parent);
    }
  }
  return found;
}

/** Contenus qui utilisent le fichier (hors sa fiche de médiathèque) */
export async function mediaUsage(strapi: any, fileId: number): Promise<MediaUsage[]> {
  const knex = strapi.db.connection;
  const related = await knex('files_related_mph').select('related_id', 'related_type').where({ file_id: fileId });
  const links = componentLinks(strapi);
  const entities: Parent[] = [];
  for (const row of related) {
    if (row.related_type === 'api::media-item.media-item') continue;
    const meta = strapi.db.metadata.get(row.related_type);
    if (!meta) continue;
    if (meta.modelType === 'component' || !String(row.related_type).includes('::')) entities.push(...(await parentsOf(strapi, links, { uid: row.related_type, id: row.related_id })));
    else entities.push({ uid: row.related_type, id: row.related_id });
  }

  const usages = new Map<string, MediaUsage>();
  for (const entity of entities) {
    const meta = strapi.db.metadata.get(entity.uid);
    if (!meta) continue;
    const row = await knex(meta.tableName).where({ id: entity.id }).first();
    if (!row?.document_id) continue;
    const key = `${entity.uid}:${row.document_id}`;
    if (usages.has(key)) continue;
    const describe = DESCRIBE[entity.uid];
    usages.set(key, {
      uid: entity.uid,
      documentId: row.document_id,
      label: describe ? `${describe.type} — ${describe.title(row) || 'sans titre'}` : entity.uid,
      path: describe ? describe.path(row) : '/',
    });
  }
  return [...usages.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}
