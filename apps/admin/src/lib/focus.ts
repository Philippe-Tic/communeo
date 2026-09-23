/**
 * Focus après navigation : le shell signale un changement de page, le titre (h1) de la nouvelle page
 * prend le focus en s'affichant. Les pages sont chargées à la demande : le h1 n'existe pas encore
 * au moment où l'adresse change.
 */
let pending = false;

export const requestHeadingFocus = () => {
  pending = true;
};

export function focusHeadingIfRequested(heading: HTMLElement | null) {
  if (!pending || !heading) return;
  pending = false;
  heading.tabIndex = -1;
  heading.focus();
}
