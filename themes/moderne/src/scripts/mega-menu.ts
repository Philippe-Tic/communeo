/**
 * Méga-menu plein écran : <dialog> modal ouvert par « Menu » (ou par la loupe, qui place le focus
 * dans la recherche). Échap et « Fermer » le referment et rendent le focus au bouton d'origine ;
 * un lien suivi ferme aussi le menu (ancre sur la même page).
 */
const dialog = document.querySelector<HTMLDialogElement>('[data-mo-mega]');
const menuButton = document.querySelector<HTMLButtonElement>('[data-mo-menu-open]');
const searchLink = document.querySelector<HTMLAnchorElement>('[data-mo-search]');
let returnTo: HTMLElement | null = null;

function open(from: HTMLElement, focusSearch = false) {
  if (!dialog || dialog.open) return;
  returnTo = from;
  dialog.showModal();
  menuButton?.setAttribute('aria-expanded', 'true');
  document.documentElement.classList.add('mo-mega-open');
  if (focusSearch) dialog.querySelector<HTMLInputElement>('[data-mo-search-input]')?.focus();
}

/** Menu fermé (Échap, « Fermer », lien suivi) : une seule fois, quel que soit le chemin */
function closed() {
  if (!document.documentElement.classList.contains('mo-mega-open')) return;
  menuButton?.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('mo-mega-open');
  returnTo?.focus();
  returnTo = null;
}

function close() {
  dialog?.close();
  closed();
}

if (dialog) {
  menuButton?.addEventListener('click', () => open(menuButton));
  searchLink?.addEventListener('click', (event) => {
    event.preventDefault();
    open(searchLink, true);
  });
  dialog.querySelector('[data-mo-menu-close]')?.addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a[href^="#"]')) close();
  });
  // Échap : `cancel` part tout de suite ; `close` suit (et couvre tout autre cas de fermeture)
  dialog.addEventListener('cancel', () => queueMicrotask(closed));
  dialog.addEventListener('close', closed);
}

export {};
