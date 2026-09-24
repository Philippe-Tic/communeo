/**
 * Versions d'un contenu (#183) : comparaison au niveau des blocs et résumé automatique d'une
 * publication (« ajout du bloc Documents », « titre modifié »). Partagé par l'API (résumé noté à
 * chaque publication) et l'admin (« Comparer au brouillon »).
 *
 * Les blocs n'ont pas d'identifiant stable d'une version à l'autre : ils sont comparés sur leur
 * contenu (sans identifiants techniques, un fichier réduit à son id), alignés par la plus longue
 * suite commune ; un bloc retiré puis un bloc ajouté du même type au même endroit est « modifié ».
 */

export const BLOCK_LABELS: Record<string, string> = {
  'blocks.text': 'Texte',
  'blocks.image': 'Image',
  'blocks.buttons': 'Bouton ou lien',
  'blocks.callout': 'Encadré',
  'blocks.documents': 'Documents',
  'blocks.gallery': 'Galerie',
  'blocks.faq': 'Questions / réponses',
  'blocks.contact': 'Contact / lieu',
  'blocks.video': 'Vidéo',
};

export const blockLabel = (component: string) => BLOCK_LABELS[component] ?? component.replace(/^blocks\./, '');

type Block = { __component: string } & Record<string, unknown>;

export interface BlockChange {
  status: 'same' | 'added' | 'removed' | 'changed';
  component: string;
  before?: Block;
  after?: Block;
}

/** Contenu comparable : sans identifiants ni horodatages, un fichier réduit à son id */
export function comparable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(comparable);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  // Fichier de la médiathèque (peuplé à la lecture, un id à l'écriture)
  if (typeof record.id === 'number' && ('url' in record || 'mime' in record)) return record.id;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    if (['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale'].includes(key)) continue;
    out[key] = comparable(record[key]);
  }
  return out;
}

const key = (block: Block) => JSON.stringify(comparable(block));

export function diffBlocks(before: Block[] = [], after: Block[] = []): BlockChange[] {
  const a = before.map(key);
  const b = after.map(key);
  // Plus longue suite commune (quelques dizaines de blocs au plus)
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1)
    for (let j = b.length - 1; j >= 0; j -= 1)
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);

  const changes: BlockChange[] = [];
  let removed: Block[] = [];
  let added: Block[] = [];
  const flush = () => {
    // Retiré puis ajouté du même type, dans l'ordre : le même bloc, modifié
    while (removed.length && added.length) {
      const index = added.findIndex((block) => block.__component === removed[0]!.__component);
      if (index === -1) break;
      const [previous] = removed.splice(0, 1);
      const [next] = added.splice(index, 1);
      changes.push({ status: 'changed', component: next!.__component, before: previous, after: next });
    }
    for (const block of removed) changes.push({ status: 'removed', component: block.__component, before: block });
    for (const block of added) changes.push({ status: 'added', component: block.__component, after: block });
    removed = [];
    added = [];
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      changes.push({ status: 'same', component: after[j]!.__component, before: before[i], after: after[j] });
      i += 1;
      j += 1;
    } else if (j < b.length && (i >= a.length || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) {
      added.push(after[j]!);
      j += 1;
    } else {
      removed.push(before[i]!);
      i += 1;
    }
  }
  flush();
  return changes;
}

/**
 * Résumé d'une publication par rapport à la précédente : « ajout du bloc Documents, titre modifié ».
 * Sans version précédente : « première publication ».
 */
export function summarizeChanges(
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>,
): string {
  if (!previous) return 'première publication';
  const parts: string[] = [];
  if ((previous.title ?? '') !== (next.title ?? '')) parts.push('titre modifié');
  const changes = diffBlocks((previous.blocks as Block[]) ?? [], (next.blocks as Block[]) ?? []).filter(
    (change) => change.status !== 'same',
  );
  const describe = (change: BlockChange) =>
    `${change.status === 'added' ? 'ajout' : change.status === 'removed' ? 'suppression' : 'modification'} du bloc ${blockLabel(change.component)}`;
  if (changes.length === 1) parts.push(describe(changes[0]!));
  else if (changes.length > 1) {
    const counts = { added: 0, removed: 0, changed: 0 };
    for (const change of changes) counts[change.status as keyof typeof counts] += 1;
    if (counts.added) parts.push(`${counts.added} bloc${counts.added > 1 ? 's' : ''} ajouté${counts.added > 1 ? 's' : ''}`);
    if (counts.changed) parts.push(`${counts.changed} bloc${counts.changed > 1 ? 's' : ''} modifié${counts.changed > 1 ? 's' : ''}`);
    if (counts.removed) parts.push(`${counts.removed} bloc${counts.removed > 1 ? 's' : ''} supprimé${counts.removed > 1 ? 's' : ''}`);
  }
  if (!parts.length) {
    const { title: _t1, blocks: _b1, ...restBefore } = previous;
    const { title: _t2, blocks: _b2, ...restAfter } = next;
    parts.push(
      JSON.stringify(comparable(restBefore)) === JSON.stringify(comparable(restAfter))
        ? 'republication sans changement'
        : 'informations modifiées',
    );
  }
  return parts.join(', ');
}
