/** Réponses du backend (comarquage) → vues prêtes à afficher. */
import { formatDate } from '../format';
import { AUDIENCE_LABELS, type DemarcheAudience, type DemarcheFolderVM, type DemarcheLinkVM, type DemarcheRef, type DemarcheThemeVM, type DemarcheVM } from './types';

type Raw = Record<string, unknown>;

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
const list = (value: unknown): Raw[] => (Array.isArray(value) ? (value as Raw[]) : []);

const ref = (value: Raw): DemarcheRef | null => {
  const id = text(value.id);
  const title = text(value.title);
  return id && title ? { id, title } : null;
};

const refs = (value: unknown) => list(value).map(ref).filter((item): item is DemarcheRef => item !== null);

/** Adresse publique d'une fiche sur service-public.fr, pour citer la source. */
export const officialUrl = (id: string, audience: DemarcheAudience) =>
  `https://www.service-public.fr/${audience === 'professionnels' ? 'professionnels-entreprises' : 'particuliers'}/vosdroits/${id}`;

/** Lien interne vers la fiche sur le site de la commune. */
export const demarcheHref = (id: string, audience: DemarcheAudience) =>
  `/demarches/fiche?id=${encodeURIComponent(id)}&public=${audience}`;

const link = (value: Raw): DemarcheLinkVM | null => {
  const label = text(value.title);
  const href = text(value.url);
  return label && href ? { label, href, cerfa: text(value.numeroCerfa) } : null;
};

const links = (value: unknown) => list(value).map(link).filter((item): item is DemarcheLinkVM => item !== null);

/** Un dossier est une page (liste de ses fiches), pas une rubrique : il devient un lien. */
const isFolderLink = (node: Raw) => node.type === 'dossier' && list(node.children).length === 0;

export function mapThemes(payload: unknown): DemarcheThemeVM[] {
  return list(payload)
    .filter((node) => !isFolderLink(node))
    .map((theme) => ({
      id: text(theme.id) ?? '',
      title: text(theme.title) ?? '',
      children: mapThemes(theme.children),
      fiches: [...refs(theme.fiches), ...refs(list(theme.children).filter(isFolderLink))],
    }))
    .filter((theme) => theme.children.length > 0 || theme.fiches.length > 0);
}

function mapFolder(value: unknown): DemarcheFolderVM | null {
  const folder = (value ?? null) as Raw | null;
  const id = folder && text(folder.id);
  const title = folder && text(folder.title);
  if (!folder || !id || !title) return null;
  const groups = list(folder.sousDossiers)
    .map((group) => ({ title: text(group.title) ?? '', fiches: refs(group.fiches) }))
    .filter((group) => group.fiches.length > 0);
  return { id, title, groups };
}

export function mapFiche(payload: unknown, audience: DemarcheAudience): DemarcheVM | null {
  const fiche = payload as Raw | null;
  const id = fiche && text(fiche.id);
  const title = fiche && text(fiche.title);
  if (!fiche || !id || !title) return null;

  const references = (fiche.references ?? {}) as Raw;
  const services = links(references.servicesEnLigne);
  const modified = text(fiche.dateModification);
  const folder = mapFolder(fiche.dossierPere);

  return {
    id,
    audience,
    title,
    isFolder: text(fiche.type)?.startsWith('Dossier') === true || folder?.id === id,
    folder,
    description: text(fiche.description),
    trail: refs(fiche.filDAriane),
    warning: (fiche.avertissement as DemarcheVM['warning']) ?? null,
    introduction: (fiche.introduction as DemarcheVM['introduction']) ?? [],
    content: (fiche.content as DemarcheVM['content']) ?? [],
    // Les formulaires (Cerfa) sont sortis des services en ligne : ce n'est pas la même démarche
    onlineServices: services.filter((service) => !service.cerfa),
    forms: services.filter((service) => service.cerfa),
    references: [...links(references.references), ...links(references.pourEnSavoirPlus)],
    seeAlso: refs(references.voirAussi),
    verifiedOn: modified ? `Vérifié le ${formatDate(modified)} – Direction de l'information légale et administrative` : null,
    source: { label: `service-public.fr (${AUDIENCE_LABELS[audience].toLowerCase()})`, href: officialUrl(id, audience) },
  };
}
