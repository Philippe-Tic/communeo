/** Réponses du backend (comarquage) → vues prêtes à afficher. */
import { formatDate } from '../format';
import { AUDIENCE_LABELS, type DemarcheAudience, type DemarcheLinkVM, type DemarcheRef, type DemarcheThemeVM, type DemarcheVM } from './types';

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

export function mapThemes(payload: unknown): DemarcheThemeVM[] {
  return list(payload).map((theme) => ({
    id: text(theme.id) ?? '',
    title: text(theme.title) ?? '',
    children: mapThemes(theme.children),
    fiches: refs(theme.fiches),
  }));
}

export function mapFiche(payload: unknown, audience: DemarcheAudience): DemarcheVM | null {
  const fiche = payload as Raw | null;
  const id = fiche && text(fiche.id);
  const title = fiche && text(fiche.title);
  if (!fiche || !id || !title) return null;

  const references = (fiche.references ?? {}) as Raw;
  const services = links(references.servicesEnLigne);
  const modified = text(fiche.dateModification);

  return {
    id,
    audience,
    title,
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
