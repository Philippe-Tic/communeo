/**
 * Recherche du site, côté navigateur : l'index Pagefind est chargé à la demande, la première
 * recherche vient de `?q=` et chaque envoi du formulaire met l'adresse à jour (retour arrière possible).
 *
 * Les résultats reprennent le titre, le type de contenu (déduit du chemin) et l'extrait fourni par
 * Pagefind, où les termes trouvés sont déjà mis en évidence.
 */
type PagefindResult = {
  data: () => Promise<{ url: string; meta?: { title?: string }; excerpt: string }>;
};

type Pagefind = {
  options?: (options: Record<string, unknown>) => Promise<void>;
  search: (term: string) => Promise<{ results: PagefindResult[] }>;
};

const TYPES: Array<[RegExp, string]> = [
  [/^\/actualites\//, 'Actualité'],
  [/^\/agenda\//, 'Événement'],
  [/^\/documents\//, 'Document officiel'],
  [/^\/associations\//, 'Association'],
  [/^\/(mentions-legales|donnees-personnelles|accessibilite|gestion-des-cookies|exercer-mes-droits|plan-du-site)$/, 'Information légale'],
];

const typeOf = (path: string) => TYPES.find(([pattern]) => pattern.test(path))?.[1] ?? 'Page';

export function initSearch() {
  const form = document.querySelector<HTMLFormElement>('[data-cn-search-form]');
  const input = document.querySelector<HTMLInputElement>('[data-cn-search-input]');
  const list = document.querySelector<HTMLOListElement>('[data-cn-search-results]');
  const count = document.querySelector<HTMLElement>('[data-cn-search-count]');
  const empty = document.querySelector<HTMLElement>('[data-cn-search-empty]');
  if (!form || !input || !list || !count) return;

  let engine: Pagefind | null | undefined;

  // L'index n'existe que sur le site construit : il est chargé à l'exécution, hors du bundle.
  // L'import passe par une fonction créée à la volée, sinon le bundler le réécrit et le casse.
  const importModule = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>;

  const load = async (): Promise<Pagefind | null> => {
    if (engine !== undefined) return engine;
    try {
      engine = (await importModule(`${location.origin}/pagefind/pagefind.js`)) as Pagefind;
    } catch {
      // Pas d'index (preview, développement) : la page le dit au visiteur
      engine = null;
    }
    return engine;
  };

  const render = async (term: string) => {
    list.innerHTML = '';
    if (empty) empty.hidden = true;
    if (!term) {
      count.textContent = '';
      return;
    }

    count.textContent = 'Recherche en cours…';
    const pagefind = await load();
    if (!pagefind) {
      count.textContent = "La recherche n'est pas disponible sur cette version du site.";
      return;
    }

    const { results } = await pagefind.search(term);
    const shown = await Promise.all(results.slice(0, 20).map((result) => result.data()));
    count.textContent = results.length
      ? `${results.length} résultat${results.length > 1 ? 's' : ''} pour « ${term} »`
      : `Aucun résultat pour « ${term} »`;
    if (empty) empty.hidden = results.length > 0;

    for (const page of shown) {
      // Pagefind donne le chemin du fichier (`/actualites/brocante.html`) : adresse de la page sans `.html`
      const path = new URL(page.url, location.origin).pathname.replace(/(\/index)?\.html$/, '').replace(/\/$/, '') || '/';
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = path;
      link.textContent = page.meta?.title ?? path;
      const type = document.createElement('p');
      type.textContent = typeOf(path);
      const excerpt = document.createElement('p');
      // Extrait produit par notre propre index : les termes trouvés sont entourés de <mark>
      excerpt.innerHTML = page.excerpt;
      item.append(link, type, excerpt);
      list.append(item);
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const term = input.value.trim();
    const url = term ? `${location.pathname}?q=${encodeURIComponent(term)}` : location.pathname;
    history.replaceState(null, '', url);
    void render(term);
  });

  const initial = new URLSearchParams(location.search).get('q') ?? '';
  if (initial) {
    input.value = initial;
    void render(initial);
  }
}
