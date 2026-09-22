/**
 * Menu principal : bouton « Menu » sur petit écran et sous-menus déroulants.
 *
 * Sans JavaScript, le menu reste déplié et les sous-menus fonctionnent en <details> natifs ;
 * ce script ne fait qu'ajouter le repli sur petit écran et les raccourcis attendus au clavier.
 *
 *   <button data-cn-menu-toggle aria-expanded="false" aria-controls="menu">
 *     <span data-cn-menu-label data-label-open="Fermer">Menu</span>
 *   </button>
 *   <nav id="menu" data-cn-menu>
 *     <details data-cn-menu-group name="menu">…</details>
 *   </nav>
 *
 * Le menu ouvert porte l'attribut `data-open` : c'est au thème de décider ce qu'il affiche.
 * Échap ferme le sous-menu ouvert (focus rendu à son libellé), puis le menu (focus rendu au bouton).
 * Un clic en dehors d'un sous-menu le referme. Le lien d'évitement « Aller au menu » le déplie.
 */
const groups = () => [...document.querySelectorAll<HTMLDetailsElement>('details[data-cn-menu-group]')];

export function initMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-cn-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-cn-menu]');
  const label = toggle?.querySelector<HTMLElement>('[data-cn-menu-label]');
  const closed = label?.textContent ?? 'Menu';

  const setMenu = (open: boolean) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? (label.dataset.labelOpen ?? closed) : closed;
    menu.toggleAttribute('data-open', open);
  };

  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    // Le lien d'évitement « Aller au menu » doit trouver un menu ouvert
    if (menu?.id && target.closest(`a[href="#${menu.id}"]`)) setMenu(true);
    for (const group of groups()) if (group.open && !group.contains(target)) group.open = false;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const group = groups().find((item) => item.open);
    if (group) {
      group.open = false;
      group.querySelector('summary')?.focus();
      return;
    }
    if (toggle?.getAttribute('aria-expanded') === 'true' && menu?.contains(document.activeElement)) {
      setMenu(false);
      toggle.focus();
    }
  });
}

initMenu();
