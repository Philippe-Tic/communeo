/**
 * Période d'essai d'une commune inscrite en libre-service (#310).
 *
 * `trial` : 30 jours à partir de la confirmation de l'inscription ; `expired` : essai terminé sans
 * passage en live (site retiré, administration en lecture seule, données conservées 6 mois puis
 * supprimées) ; `live` : commune cliente, ou créée par l'équipe Communeo.
 */
export const TRIAL_DAYS = 30;
/** Conservation des données après la fin de l'essai (6 mois) */
export const EXPIRED_RETENTION_DAYS = 183;
/** Dernier rappel avant la suppression des données */
export const DELETION_NOTICE_DAYS = 30;

const DAY = 86_400_000;

export const addDays = (date: Date | string, days: number) => new Date(new Date(date).getTime() + days * DAY);

/** Jours d'essai restants, arrondis au jour supérieur : 1 le dernier jour, 0 une fois l'essai fini */
export function trialDaysLeft(endsAt: Date | string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now.getTime()) / DAY));
}

/** Date de suppression des données d'une commune dont l'essai s'est terminé à `expiredAt` */
export const deletionDate = (expiredAt: Date | string) => addDays(expiredAt, EXPIRED_RETENTION_DAYS);
