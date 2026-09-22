/**
 * Alertes du bandeau, côté navigateur :
 * - les alertes terminées disparaissent à leur date de fin, sans reconstruire le site ;
 * - les alertes en cours sont rechargées depuis l'API publique, donc une alerte publiée dans
 *   l'admin s'affiche à la visite suivante, sans mise en ligne ;
 * - une alerte non urgente masquée par le visiteur le reste (mémorisé dans le navigateur).
 *
 * L'adresse de l'API est posée sur <body> par le renderer (`data-cn-alerts-endpoint`).
 * Sans elle (preview, développement), seul le rendu du build est affiché.
 */
import { mapAlert, type AlertVM } from '@communeo/core/client';

const KEY = 'communeo-alertes-masquees';

const dismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

const remember = (id: string) => {
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set([...dismissed(), id])]));
  } catch {
    // Stockage indisponible : l'alerte réapparaîtra à la page suivante
  }
};

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Même balisage que le rendu du build : le thème n'a qu'une seule mise en forme à écrire. */
function render(alert: AlertVM): string {
  const link = alert.link
    ? ` <a href="${escape(alert.link.href)}"${alert.link.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escape(alert.link.label)}${
        alert.link.external ? '<span class="cn-sr-only"> (nouvelle fenêtre)</span>' : ''
      }</a>`
    : '';
  const close =
    alert.severity.key === 'critical'
      ? ''
      : `<button type="button" class="cn-alert-close cn-js-only" data-cn-alert-close><span aria-hidden="true">✕</span><span class="cn-sr-only">Masquer l'alerte « ${escape(alert.title)} »</span></button>`;
  return (
    `<div class="cn-alert cn-alert-${alert.severity.key}" data-cn-alert="${escape(alert.id)}"${alert.displayUntil ? ` data-cn-alert-until="${escape(alert.displayUntil)}"` : ''}>` +
    `<div class="cn-alert-inner"><span class="cn-alert-icon" aria-hidden="true"></span>` +
    `<p class="cn-alert-text"><strong>${escape(alert.severity.label)} – ${escape(alert.title)} :</strong> ` +
    `<span class="cn-alert-detail">${escape(alert.message)}${link}</span></p>${close}</div></div>`
  );
}

function refreshVisibility(region: HTMLElement) {
  const now = Date.now();
  const hidden = dismissed();
  let visible = 0;
  for (const alert of region.querySelectorAll<HTMLElement>('[data-cn-alert]')) {
    const until = alert.dataset.cnAlertUntil;
    const expired = Boolean(until) && new Date(until!).getTime() <= now;
    alert.hidden = expired || hidden.includes(alert.dataset.cnAlert!);
    if (!alert.hidden) visible += 1;
  }
  region.hidden = visible === 0;
}

export async function initAlerts() {
  const region = document.querySelector<HTMLElement>('[data-cn-alerts]');
  if (!region) return;
  refreshVisibility(region);

  region.addEventListener('click', (event) => {
    const alert = (event.target as HTMLElement).closest<HTMLElement>('[data-cn-alert]');
    if (!(event.target as HTMLElement).closest('[data-cn-alert-close]') || !alert) return;
    remember(alert.dataset.cnAlert!);
    refreshVisibility(region);
    document.getElementById('contenu')?.focus();
  });

  const endpoint = document.body.dataset.cnAlertsEndpoint;
  if (!endpoint) return;

  const payload = (await fetch(endpoint)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null)) as { data?: unknown[] } | null;
  if (!payload?.data) return;

  const context = { siteUrl: location.origin, mediaUrl: '' };
  const alerts = payload.data.map((alert) => mapAlert(context, alert as Parameters<typeof mapAlert>[1]));
  // Le serveur a déjà filtré les alertes actives : ce qui revient remplace le rendu du build
  region.innerHTML = alerts.map(render).join('');
  refreshVisibility(region);
}

void initAlerts();
