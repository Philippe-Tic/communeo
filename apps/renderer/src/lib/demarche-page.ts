/**
 * Affichage d'une fiche de démarche dans le navigateur : la fiche demandée (`?id=…&public=…`)
 * est récupérée auprès de l'API publique, puis rendue avec le balisage commun à tous les thèmes.
 */
import { demarcheHref, mapFiche, officialUrl, renderNodes, type DemarcheAudience, type DemarcheLinkVM, type DemarcheRef, type DemarcheVM } from '@communeo/core/client';

const AUDIENCES: DemarcheAudience[] = ['particuliers', 'professionnels'];

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const linkList = (title: string, links: DemarcheLinkVM[], external = true) =>
  links.length
    ? `<section class="cn-demarche-links"><h2>${escape(title)}</h2><ul>${links
        .map(
          (link) =>
            `<li><a href="${escape(link.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(link.label)}${
              external ? '<span class="cn-sr-only"> (nouvelle fenêtre)</span>' : ''
            }</a>${link.cerfa ? ` <span class="cn-demarche-cerfa">Cerfa n° ${escape(link.cerfa)}</span>` : ''}</li>`,
        )
        .join('')}</ul></section>`
    : '';

const refList = (title: string, refs: DemarcheRef[], audience: DemarcheAudience) =>
  refs.length
    ? `<section class="cn-demarche-links"><h2>${escape(title)}</h2><ul>${refs
        .map((ref) => `<li><a href="${escape(demarcheHref(ref.id, audience))}">${escape(ref.title)}</a></li>`)
        .join('')}</ul></section>`
    : '';

/**
 * Fiches d'un dossier, par sous-dossier. Sur la page du dossier, c'est son contenu ; sur une fiche,
 * les autres fiches du même dossier (la fiche courante est signalée par aria-current).
 */
function folderList(fiche: DemarcheVM): string {
  const folder = fiche.folder;
  if (!folder || !folder.groups.length) return '';
  const own = fiche.isFolder;
  const titled = folder.groups.filter((group) => group.title && group.title !== folder.title);
  const items = (fiches: DemarcheRef[]) =>
    `<ul>${fiches
      .map((ref) =>
        ref.id === fiche.id
          ? `<li><a href="${escape(demarcheHref(ref.id, fiche.audience))}" aria-current="page">${escape(ref.title)}</a></li>`
          : `<li><a href="${escape(demarcheHref(ref.id, fiche.audience))}">${escape(ref.title)}</a></li>`,
      )
      .join('')}</ul>`;
  const heading = own ? 'Les fiches de ce dossier' : `Dans le dossier « ${folder.title} »`;
  // Sous-dossiers nommés (« Pour un majeur », « Pour un mineur ») : un titre chacun
  const body = titled.length
    ? folder.groups.map((group) => `${group.title && group.title !== folder.title ? `<h3>${escape(group.title)}</h3>` : ''}${items(group.fiches)}`).join('')
    : items(folder.groups.flatMap((group) => group.fiches));
  const more = own ? '' : `<p><a href="${escape(demarcheHref(folder.id, fiche.audience))}">Tout le dossier « ${escape(folder.title)} »</a></p>`;
  return `<section class="cn-demarche-links cn-demarche-folder"><h2>${escape(heading)}</h2>${body}${more}</section>`;
}

export function renderFiche(fiche: DemarcheVM): string {
  return [
    fiche.description ? `<p class="cn-demarche-lead">${escape(fiche.description)}</p>` : '',
    fiche.warning ? renderNodes([fiche.warning], 2, fiche.audience) : '',
    renderNodes(fiche.introduction, 2, fiche.audience),
    fiche.isFolder ? folderList(fiche) : '',
    renderNodes(fiche.content, 2, fiche.audience),
    linkList('Faire la démarche en ligne', fiche.onlineServices),
    linkList('Formulaires à remplir', fiche.forms),
    fiche.isFolder ? '' : folderList(fiche),
    refList('Voir aussi', fiche.seeAlso, fiche.audience),
    linkList('Textes de référence et pour en savoir plus', fiche.references),
    `<footer class="cn-demarche-source"><p>${fiche.verifiedOn ? escape(fiche.verifiedOn) : ''}</p>` +
      `<p>Source : <a href="${escape(fiche.source.href)}" target="_blank" rel="noopener noreferrer">${escape(fiche.source.label)}<span class="cn-sr-only"> (nouvelle fenêtre)</span></a></p></footer>`,
  ].join('');
}

export async function initDemarche() {
  const container = document.querySelector<HTMLElement>('[data-cn-demarche]');
  const status = container?.querySelector<HTMLElement>('[data-cn-demarche-status]');
  if (!container || !status) return;

  const params = new URLSearchParams(location.search);
  const id = (params.get('id') ?? '').trim();
  const requested = params.get('public') ?? 'particuliers';
  const audience = AUDIENCES.includes(requested as DemarcheAudience) ? (requested as DemarcheAudience) : 'particuliers';

  const fallback = (message: string) => {
    status.innerHTML =
      `${escape(message)} ${
        id
          ? `<a href="${escape(officialUrl(id, audience))}" target="_blank" rel="noopener noreferrer">Consulter la fiche sur service-public.fr<span class="cn-sr-only"> (nouvelle fenêtre)</span></a>. `
          : ''
      }<a href="/demarches">Revenir à la liste des démarches</a>.`;
  };

  if (!id) return fallback('Aucune fiche demandée.');

  const endpoint = container.dataset.endpoint!;
  // En démonstration, l'adresse pointe directement sur une fiche d'exemple (ou un dossier d'exemple)
  const url = endpoint.endsWith('.json')
    ? id.startsWith('N')
      ? endpoint.replace(/\.json$/, '-dossier.json')
      : endpoint
    : `${endpoint}/${audience}/${encodeURIComponent(id)}`;
  const payload = (await fetch(url)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null)) as { data?: unknown } | null;

  const fiche = mapFiche(payload?.data, audience);
  if (!fiche) return fallback("Cette fiche n'a pas pu être chargée.");

  // Le titre de la page est celui du thème : on y met celui de la fiche plutôt que d'en ajouter un second
  document.title = `${fiche.title} – ${document.title.split(' – ').pop()}`;
  const heading = document.querySelector<HTMLElement>('main h1');
  if (heading) heading.textContent = fiche.title;
  const current = document.querySelector<HTMLElement>('nav[aria-label="Fil d’Ariane"] [aria-current="page"], nav[aria-label="Fil d\'Ariane"] [aria-current="page"]');
  if (current) current.textContent = fiche.title;
  container.innerHTML = renderFiche(fiche);
}
