/**
 * Boutons qui ouvrent et ferment une zone (menu mobile, sous-menus) : motif « disclosure » du W3C.
 *
 *   <button type="button" aria-expanded="false" aria-controls="menu-mairie" data-cn-disclosure>Mairie</button>
 *   <ul id="menu-mairie" hidden>…</ul>
 *
 * Échap ferme la zone ouverte et rend le focus au bouton ; un clic à l'extérieur la ferme aussi
 * (sauf data-cn-disclosure="sticky").
 */
const buttons = () => [...document.querySelectorAll<HTMLButtonElement>('button[data-cn-disclosure]')];
const target = (button: HTMLButtonElement) => document.getElementById(button.getAttribute('aria-controls') ?? '');

function toggle(button: HTMLButtonElement, open: boolean) {
  const zone = target(button);
  if (!zone) return;
  button.setAttribute('aria-expanded', String(open));
  zone.hidden = !open;
}

export function initDisclosures() {
  for (const button of buttons()) {
    if (button.dataset.cnReady) continue;
    button.dataset.cnReady = 'true';
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      // Un seul sous-menu ouvert à la fois dans un même groupe
      if (open && button.dataset.cnDisclosure === 'menu') {
        for (const other of buttons()) if (other !== button && other.dataset.cnDisclosure === 'menu') toggle(other, false);
      }
      toggle(button, open);
    });
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const open = buttons().find((button) => button.getAttribute('aria-expanded') === 'true' && target(button)?.contains(document.activeElement));
  if (open) {
    toggle(open, false);
    open.focus();
  }
});

document.addEventListener('click', (event) => {
  for (const button of buttons()) {
    if (button.dataset.cnDisclosure === 'sticky' || button.getAttribute('aria-expanded') !== 'true') continue;
    const zone = target(button);
    if (!button.contains(event.target as Node) && !zone?.contains(event.target as Node)) toggle(button, false);
  }
});

initDisclosures();
