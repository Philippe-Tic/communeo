/**
 * Rendu du contenu d'une fiche de démarche en HTML sémantique.
 *
 * La fiche est chargée dans le navigateur (le corpus complet de la DILA ne peut pas être construit
 * page par page pour chaque commune) : cette fonction produit le balisage que le thème habille.
 * Tout texte est échappé ; seules les balises produites ici sont émises.
 */
import { demarcheHref } from './map';
import type { DemarcheAudience, DemarcheNode } from './types';

const CALLOUTS: Record<string, string> = {
  aSavoir: 'À savoir',
  aNoter: 'À noter',
  attention: 'Attention',
  rappel: 'Rappel',
  exemple: 'Exemple',
};

export const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const safeHref = (href: string | undefined) => (href && /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) ? href : null);

const heading = (level: number) => `h${Math.min(level, 6)}`;

/** Identifiant d'une fiche ou d'un dossier de la DILA (F1341, N358) ; les R… sont des ressources (glossaire…) */
const FICHE_ID = /^[FN]\d+$/;
const RESOURCE_ID = /^[A-Z]\d+$/;

/**
 * `level` : niveau du prochain titre (3 sous le H2 « La démarche » de la page) ; `audience` : public
 * des liens vers les autres fiches, qui restent sur le site de la commune.
 */
export function renderNodes(nodes: DemarcheNode[] | undefined, level = 3, audience: DemarcheAudience = 'particuliers'): string {
  return (nodes ?? []).map((node) => renderNode(node, level, audience)).join('');
}

function renderNode(node: DemarcheNode, level: number, audience: DemarcheAudience): string {
  const title = node.title?.trim();
  const inner = () => renderNodes(node.children, level + 1, audience);
  const renderInline = (child: DemarcheNode) => renderInlineFor(child, audience);

  switch (node.type) {
    case 'chapitre': {
      const tag = heading(level);
      return `<section>${title ? `<${tag}>${escapeHtml(title)}</${tag}>` : ''}${inner()}</section>`;
    }
    case 'paragraphe':
      return `<p>${renderInline(node)}</p>`;
    case 'texte':
    case 'expression':
    case 'valeur':
      return renderInline(node);
    case 'liste': {
      const tag = node.attributes?.listeType === 'ordonnee' ? 'ol' : 'ul';
      return `<${tag}>${(node.children ?? []).map((item) => `<li>${renderNodes(item.children, level, audience)}</li>`).join('')}</${tag}>`;
    }
    case 'element':
      return `<li>${renderNodes(node.children, level, audience)}</li>`;
    case 'tableau': {
      const rows = (node.children ?? [])
        .map((row) => `<tr>${(row.children ?? []).map((cell) => renderCell(cell, level, audience)).join('')}</tr>`)
        .join('');
      const caption = title ? `<caption>${escapeHtml(title)}</caption>` : '';
      return `<div class="cn-demarche-table"><table>${caption}<tbody>${rows}</tbody></table></div>`;
    }
    case 'situation':
    case 'fragmentConditionne':
    case 'blocCas': {
      const tag = heading(level);
      return `<section class="cn-demarche-case">${title ? `<${tag}>${escapeHtml(title)}</${tag}>` : ''}${inner()}</section>`;
    }
    case 'complement':
      return `<details class="cn-demarche-complement"><summary>${escapeHtml(title || 'En savoir plus')}</summary>${renderNodes(node.children, level, audience)}</details>`;
    case 'titreFlottant':
      return node.text?.trim() ? `<p class="cn-demarche-subtitle"><strong>${escapeHtml(node.text.trim())}</strong></p>` : '';
    case 'serviceEnLigne': {
      const href = safeHref(node.href);
      return href && title
        ? `<p class="cn-demarche-service"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}<span class="cn-sr-only"> (nouvelle fenêtre)</span></a></p>`
        : '';
    }
    case 'ouSAdresser': {
      // « Mairie » : c'est la commune dont on est sur le site, sa page Contact répond
      const townHall = node.attributes?.pivot === 'mairie';
      const href = safeHref(node.href);
      const place = title ? escapeHtml(title) : 'Mairie';
      const target = href
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${place}<span class="cn-sr-only"> (nouvelle fenêtre)</span></a>`
        : townHall
          ? `<a href="/contact">${place}</a>`
          : place;
      const contact = townHall && href ? ` – <a href="/contact">contacter la mairie</a>` : '';
      return `<aside class="cn-demarche-callout cn-demarche-where" aria-label="Où s'adresser ?"><p class="cn-demarche-callout-label"><strong>Où s'adresser ?</strong></p><p>${target}${contact}</p>${inner()}</aside>`;
    }
    case 'listeSituations':
      return `<div class="cn-demarche-cases">${inner()}</div>`;
    case 'aSavoir':
    case 'aNoter':
    case 'attention':
    case 'rappel':
    case 'exemple': {
      const label = CALLOUTS[node.type] ?? 'À savoir';
      return `<aside class="cn-demarche-callout cn-demarche-${node.type}" aria-label="${escapeHtml(title || label)}"><p class="cn-demarche-callout-label"><strong>${escapeHtml(label)}${title && title !== label ? ` – ${escapeHtml(title)}` : ''}</strong></p>${inner()}</aside>`;
    }
    default:
      return inner();
  }
}

/** Cellule : en-tête de colonne ou de ligne (`scope`), fusions ; une cellule d'en-tête vide reste un `td`. */
function renderCell(cell: DemarcheNode, level: number, audience: DemarcheAudience): string {
  const inner = renderNodes(cell.children, level, audience);
  const attributes = cell.attributes ?? {};
  const span = ['colspan', 'rowspan']
    .filter((name) => /^([2-9]|[1-9]\d+)$/.test(attributes[name] ?? ''))
    .map((name) => ` ${name}="${attributes[name]}"`)
    .join('');
  const empty = !inner.replace(/<[^>]+>/g, '').trim();
  const header = attributes.header === 'col' || attributes.header === 'row' ? attributes.header : null;
  return header && !empty ? `<th scope="${header}"${span}>${inner}</th>` : `<td${span}>${inner}</td>`;
}

/** Contenu d'un paragraphe : texte, mises en évidence, exposants et liens. */
function renderInlineFor(node: DemarcheNode, audience: DemarcheAudience): string {
  const renderInline = (child: DemarcheNode) => renderInlineFor(child, audience);
  const own = node.text ? escapeHtml(node.text) : '';
  const children = (node.children ?? [])
    .map((child) => {
      switch (child.type) {
        case 'miseEnEvidence':
          return `<strong>${renderInline(child)}</strong>`;
        case 'exposant':
          return `<sup>${renderInline(child)}</sup>`;
        case 'lienExterne': {
          const href = safeHref(child.href);
          const label = renderInline(child) || escapeHtml(child.href ?? '');
          return href
            ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}<span class="cn-sr-only"> (nouvelle fenêtre)</span></a>`
            : label;
        }
        case 'lienInterne':
        case 'lienIntra': {
          const target = child.attributes?.ficheId || child.href || '';
          const label = renderInline(child);
          // Renvoi au glossaire ou à une ressource : le texte seul (un lien vide ou sans page n'aide personne)
          const href = FICHE_ID.test(target) ? demarcheHref(target, audience) : RESOURCE_ID.test(target) ? null : safeHref(child.href);
          return href && label.replace(/<[^>]+>/g, '').trim() ? `<a href="${escapeHtml(href)}">${label}</a>` : label;
        }
        case 'paragraphe':
        case 'liste':
        case 'tableau':
          return renderNode(child, 4, audience);
        default:
          return renderInline(child);
      }
    })
    .join('');
  return `${own}${children}`;
}
