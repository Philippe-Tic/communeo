/**
 * Validation des blocs par @communeo/core (mêmes règles que le backend), dans le schéma zod du contenu :
 * les problèmes deviennent des erreurs de champs (`blocks.3.buttons.0.label`), dans la même passe que
 * les autres champs, affichées sous les champs et dans le récapitulatif.
 */
import { validateBlocks, type ValidationMode } from '@communeo/core';
import { z } from 'zod';
import { blockType, type Block } from './catalog';

export function blocksSchema(mode: ValidationMode) {
  return z.array(z.custom<Block>((value) => typeof value === 'object' && value !== null)).superRefine((blocks, ctx) => {
    for (const issue of validateBlocks(blocks, mode).issues) {
      ctx.addIssue({ code: 'custom', path: issue.index >= 0 ? [issue.index, ...issue.path] : [], message: issue.message });
    }
  });
}

/** Libellé d'une erreur de bloc dans le récapitulatif : « Bloc 3 (Texte) : Le texte est vide » */
export function describeBlockError(name: string, message: string, blocks: Block[] | undefined, root = 'blocks'): string {
  const match = new RegExp(`^${root}\\.(\\d+)(\\.|$)`).exec(name);
  if (!match) return message;
  const index = Number(match[1]);
  const label = blockType(blocks?.[index]?.__component ?? '')?.label ?? 'Bloc';
  return `Bloc ${index + 1} (${label}) : ${message}`;
}
