/**
 * Marque le jour courant parmi des éléments datés (menus de la cantine, agenda) :
 * les sites étant statiques, « aujourd'hui » ne peut être décidé qu'à l'affichage.
 *
 *   <article data-cn-day="2026-09-22">…</article>  →  data-today sur celui du jour
 */
export function markToday(now = new Date()) {
  const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(now);
  for (const element of document.querySelectorAll<HTMLElement>('[data-cn-day]')) {
    element.toggleAttribute('data-today', element.dataset.cnDay === today);
  }
}

markToday();
