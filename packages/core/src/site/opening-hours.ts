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

/** Plages d'un jour : 4 au plus, sans chevauchement (le statut « ouverte » les lit dans l'ordre) */
const dayRangesSchema = z
  .array(timeRangeSchema)
  .max(4, 'Quatre plages au plus par jour')
  .superRefine((ranges, ctx) => {
    const sorted = [...ranges].sort((a, b) => a.open.localeCompare(b.open));
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index]!.open < sorted[index - 1]!.close) {
        ctx.addIssue({ code: 'custom', message: 'Deux plages se chevauchent', path: [ranges.indexOf(sorted[index]!)] });
        return;
      }
    }
  });

export const openingHoursSchema = z.object({
  days: z.object(Object.fromEntries(WEEKDAYS.map((day) => [day, dayRangesSchema])) as Record<Weekday, typeof dayRangesSchema>),
  closures: z
    .array(
      z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
          end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide').nullish(),
          label: z.string().max(120, 'Le motif ne doit pas dépasser 120 caractères').nullish(),
        })
        .refine((closure) => !closure.end || closure.end >= closure.date, { message: 'La fin doit être après le début', path: ['end'] }),
    )
    .max(60)
    .default([]),
  note: z.string().max(300).nullish(),
});

// Le type OpeningHours (dans opening-status.ts) doit rester compatible avec ce schéma
export const assertOpeningHours = (value: z.infer<typeof openingHoursSchema>): OpeningHours => value;

