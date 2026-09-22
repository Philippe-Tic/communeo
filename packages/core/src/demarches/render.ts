/**
 * Rendu du contenu d'une fiche de démarche en HTML sémantique.
 *
 * La fiche est chargée dans le navigateur (le corpus complet de la DILA ne peut pas être construit
 * page par page pour chaque commune) : cette fonction produit le balisage que le thème habille.
 * Tout texte est échappé ; seules les balises produites ici sont émises.
 */
import type { DemarcheNode } from './types';

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

/** `level` : niveau du prochain titre (3 sous le H2 « La démarche » de la page). */
export function renderNodes(nodes: DemarcheNode[] | undefined, level = 3): string {
  return (nodes ?? []).map((node) => renderNode(node, level)).join('');
}

function renderNode(node: DemarcheNode, level: number): string {
  const title = node.title?.trim();
  const inner = () => renderNodes(node.children, level + 1);

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
      return `<${tag}>${(node.children ?? []).map((item) => `<li>${renderNodes(item.children, level)}</li>`).join('')}</${tag}>`;
    }
    case 'element':
      return `<li>${renderNodes(node.children, level)}</li>`;
    case 'tableau': {
      const rows = (node.children ?? [])
        .map((row) => `<tr>${(row.children ?? []).map((cell) => `<td>${renderNodes(cell.children, level)}</td>`).join('')}</tr>`)
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

/** Contenu d'un paragraphe : texte, mises en évidence, exposants et liens. */
function renderInline(node: DemarcheNode): string {
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
          const href = safeHref(child.href);
          const label = renderInline(child);
          return href ? `<a href="${escapeHtml(href)}">${label}</a>` : label;
        }
        case 'paragraphe':
        case 'liste':
        case 'tableau':
          return renderNode(child, 4);
        default:
          return renderInline(child);
      }
    })
    .join('');
  return `${own}${children}`;
}
