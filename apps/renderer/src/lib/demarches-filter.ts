/**
 * Filtre de l'annuaire des démarches : masque les fiches qui ne correspondent pas, déplie les
 * rubriques qui gardent des résultats et annonce leur nombre. Sans JavaScript, l'arborescence
 * reste consultable telle quelle.
 */
export function initDemarchesFilter() {
  const form = document.querySelector<HTMLFormElement>('[data-cn-demarches-filter]');
  const input = form?.querySelector<HTMLInputElement>('[data-cn-demarches-input]');
  const count = form?.querySelector<HTMLElement>('[data-cn-demarches-count]');
  if (!form || !input) return;

  const fiches = [...document.querySelectorAll<HTMLElement>('[data-cn-demarches-fiche]')];
  const themes = [...document.querySelectorAll<HTMLDetailsElement>('[data-cn-demarches-theme] details')];

  const apply = () => {
    const term = input.value.trim().toLowerCase();
    let visible = 0;
    for (const fiche of fiches) {
      const match = !term || (fiche.dataset.cnDemarchesFiche ?? '').includes(term);
      fiche.hidden = !match;
      if (match) visible += 1;
    }
    for (const details of themes) {
      const kept = [...details.querySelectorAll<HTMLElement>('[data-cn-demarches-fiche]')].some((fiche) => !fiche.hidden);
      const parent = details.parentElement;
      if (parent) parent.hidden = !kept;
      // Les rubriques ne s'ouvrent d'elles-mêmes que pendant une recherche
      details.open = Boolean(term) && kept;
      for (const group of details.querySelectorAll<HTMLElement>('li > ul')) {
        const list = group.parentElement;
        if (list) list.hidden = ![...group.querySelectorAll<HTMLElement>('[data-cn-demarches-fiche]')].some((fiche) => !fiche.hidden);
      }
    }
    if (count) count.textContent = term ? `${visible} démarche${visible > 1 ? 's' : ''} trouvée${visible > 1 ? 's' : ''}` : '';
  };

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', apply);
}
