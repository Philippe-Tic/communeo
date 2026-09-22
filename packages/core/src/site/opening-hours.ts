/**
 * Horaires d'ouverture structurés (mairie, lieux) : plages par jour et fermetures exceptionnelles.
 * Le statut « ouverte en ce moment » dépend de l'heure du visiteur : il est calculé dans le navigateur
 * (les sites sont statiques), avec les fonctions ci-dessous.
 */
import { z } from 'zod';

import { WEEKDAYS, type OpeningHours, type Weekday } from './opening-status';

export * from './opening-status';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const timeRangeSchema = z
  .object({ open: z.string().regex(TIME, 'Heure invalide (HH:MM)'), close: z.string().regex(TIME, 'Heure invalide (HH:MM)') })
  .refine((range) => range.open < range.close, { message: "L'heure de fermeture doit être après l'ouverture" });

export const openingHoursSchema = z.object({
  days: z.object(Object.fromEntries(WEEKDAYS.map((day) => [day, z.array(timeRangeSchema).max(4)])) as Record<Weekday, z.ZodArray<typeof timeRangeSchema>>),
  closures: z
    .array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), label: z.string().max(120).nullish() }))
    .max(60)
    .default([]),
  note: z.string().max(300).nullish(),
});

// Le type OpeningHours (dans opening-status.ts) doit rester compatible avec ce schéma
export const assertOpeningHours = (value: z.infer<typeof openingHoursSchema>): OpeningHours => value;

