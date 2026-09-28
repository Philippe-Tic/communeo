/**
 * Page Démarches : la recherche porte sur toutes les fiches de service-public.fr, pas seulement sur
 * l'arborescence affichée. `?q=` (et `?public=`) lance la recherche à l'arrivée, chaque recherche met
 * l'adresse à jour. Sans JavaScript, l'arborescence reste consultable.
 */
import type { DemarcheAudience } from '@communeo/core/client';
import { resultCount, searchDemarches, searchResultItem } from './demarches-search';

export function initDemarchesSearch() {
  const form = document.querySelector<HTMLFormElement>('[data-cn-demarches-search]');
  const input = form?.querySelector<HTMLInputElement>('[data-cn-demarches-input]');
  const audienceField = form?.querySelector<HTMLInputElement | HTMLSelectElement>('[data-cn-demarches-audience]');
  const count = document.querySelector<HTMLElement>('[data-cn-demarches-count]');
  const list = document.querySelector<HTMLOListElement>('[data-cn-demarches-results]');
  if (!form || !input || !audienceField || !count || !list) return;

  const endpoint = form.dataset.endpoint!;
  let latest = 0;

  const render = async (query: string, audience: DemarcheAudience) => {
    const request = ++latest;
    list.replaceChildren();
    if (!query) {
      count.textContent = '';
      return;
    }
    count.textContent = 'Recherche en cours…';
    const found = await searchDemarches(endpoint, audience, query, 30);
    // Une recherche plus récente a pris le relais
    if (request !== latest) return;
    if (!found) {
      count.textContent = "La recherche des démarches n'est pas disponible pour le moment : parcourez les thèmes ci-dessous.";
      return;
    }
    count.textContent = resultCount(found.total, query);
    list.replaceChildren(...found.results.map((result) => searchResultItem(result, audience)));
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    const audience = audienceField.value as DemarcheAudience;
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (query && audienceField instanceof HTMLSelectElement) params.set('public', audience);
    history.replaceState(null, '', params.size ? `${location.pathname}?${params}` : location.pathname);
    void render(query, audience);
  });

  const params = new URLSearchParams(location.search);
  const requested = params.get('public');
  if (requested && [...(audienceField instanceof HTMLSelectElement ? audienceField.options : [])].some((option) => option.value === requested)) {
    audienceField.value = requested;
  }
  const initial = (params.get('q') ?? '').trim();
  if (initial) {
    input.value = initial;
    void render(initial, audienceField.value as DemarcheAudience);
  }
}
