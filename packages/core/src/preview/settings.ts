/**
 * Réglages non enregistrés montrés par la preview : l'admin les envoie avec le jeton de preview
 * (POST de formulaire vers le serveur de preview) pour voir le rendu du thème avant d'enregistrer.
 * Seuls les champs du Site listés ici sont acceptés, validés comme à l'enregistrement.
 */
import { z } from 'zod';
import { navigationConfigSchema } from '../site/navigation';

export const previewSettingsSchema = z
  .object({
    navigation_config: navigationConfigSchema.optional(),
  })
  .strict();

export type PreviewSettings = z.infer<typeof previewSettingsSchema>;

/** Nom des champs du formulaire envoyé au serveur de preview */
export const PREVIEW_FORM = { token: 'token', settings: 'settings' } as const;
