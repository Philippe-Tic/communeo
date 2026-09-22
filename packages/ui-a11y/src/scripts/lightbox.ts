/**
 * Agrandissement des images d'une galerie, dans une fenêtre modale <dialog> :
 * le focus y est piégé par le navigateur, Échap ferme, les flèches passent d'une image à l'autre
 * et le focus revient sur la vignette d'origine.
 *
 * Sans JavaScript, la vignette est un lien vers l'image : elle s'ouvre normalement.
 */
export function initLightbox() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-cn-lightbox]');
  const image = dialog?.querySelector<HTMLImageElement>('[data-cn-lightbox-image]');
  const caption = dialog?.querySelector<HTMLElement>('[data-cn-lightbox-caption]');
  const counter = dialog?.querySelector<HTMLElement>('[data-cn-lightbox-counter]');
  if (!dialog || !image) return;

  let items: HTMLAnchorElement[] = [];
  let current = 0;

  const show = (index: number) => {
    if (!items.length) return;
    current = (index + items.length) % items.length;
    const item = items[current];
    image.src = item.href;
    image.alt = item.querySelector('img')?.alt ?? '';
    if (caption) {
      caption.textContent = item.dataset.cnLightboxCaption ?? '';
      caption.hidden = !caption.textContent;
    }
    if (counter) counter.textContent = `Image ${current + 1} sur ${items.length}`;
  };

  document.addEventListener('click', (event) => {
    const item = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-cn-lightbox-item]');
    if (!item) return;
    event.preventDefault();
    // Chaque galerie a sa propre suite d'images
    const gallery = item.closest<HTMLElement>('[data-cn-gallery]');
    items = [...(gallery ?? document).querySelectorAll<HTMLAnchorElement>('a[data-cn-lightbox-item]')];
    show(items.indexOf(item));
    dialog.showModal();
  });

  dialog.querySelector('[data-cn-lightbox-previous]')?.addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-cn-lightbox-next]')?.addEventListener('click', () => show(current + 1));
  dialog.querySelector('[data-cn-lightbox-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
  // La fermeture rend le focus à la vignette, une fois la fenêtre vraiment refermée
  dialog.addEventListener('close', () => requestAnimationFrame(() => items[current]?.focus()));
}

initLightbox();
