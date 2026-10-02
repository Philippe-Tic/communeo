/**
 * Suppression d'une commune (#391). L'équipe Communeo supprime tout de suite ; un administrateur de la
 * commune en fait la demande, exécutée au bout de `COMMUNE_DELETION_DAYS` jours et annulable jusque-là
 * (par la mairie ou par l'équipe). Les deux confirment en tapant le nom de la commune.
 */
import { addDays } from './trial';

/** Délai entre la demande d'une commune et la suppression */
export const COMMUNE_DELETION_DAYS = 7;

/** Date de suppression d'une demande faite à `requestedAt` */
export const communeDeletionDate = (requestedAt: Date | string) => addDays(requestedAt, COMMUNE_DELETION_DAYS);

const normalize = (text: string) => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR');

/** Le nom tapé pour confirmer est bien celui de la commune (casse et espaces ignorés, accents comptés) */
export const deletionConfirmed = (typed: unknown, communeName: string) =>
  typeof typed === 'string' && normalize(typed) !== '' && normalize(typed) === normalize(communeName);
