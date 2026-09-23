/**
 * Glisser-déposer au clavier dans une liste verticale : une flèche = une position, même quand une
 * entrée voisine est haute (groupe ouvert). Le déplacement par défaut de dnd-kit (coins les plus
 * proches) sauterait par-dessus.
 */
import type { KeyboardCoordinateGetter } from '@dnd-kit/core';

export const stepCoordinates =
  (keys: string[]): KeyboardCoordinateGetter =>
  (event, { context: { active, over, droppableRects, collisionRect } }) => {
    const direction = event.code === 'ArrowDown' ? 1 : event.code === 'ArrowUp' ? -1 : 0;
    if (!direction || !active || !collisionRect) return undefined;
    event.preventDefault();
    const target = keys[keys.indexOf(String(over?.id ?? active.id)) + direction];
    const rect = target ? droppableRects.get(target) : undefined;
    if (!rect) return undefined;
    // Centre de l'élément déplacé sur le centre du voisin : c'est lui que vise closestCenter
    return { x: collisionRect.left, y: rect.top + rect.height / 2 - collisionRect.height / 2 };
  };

export const rank = (index: number, total: number) => `position ${index + 1} sur ${total}`;
