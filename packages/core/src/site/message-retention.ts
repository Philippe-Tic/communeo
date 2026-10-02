/**
 * Durée de conservation des messages des habitants (#342) : la commune, responsable du traitement,
 * choisit au bout de combien de temps les messages traités sont supprimés automatiquement (RGPD,
 * art. 5.1.e). « Jamais » reste possible : la correspondance d'une mairie peut relever des archives
 * publiques (Code du patrimoine), la suppression est un choix de la commune.
 *
 * Partagé par le backend (tâche de nuit, réglage), l'admin (réglage, écran Messages, Conformité) et
 * le renderer (page « Données personnelles »).
 */

export const MESSAGE_RETENTIONS = ['months_6', 'months_12', 'months_24', 'months_36', 'never'] as const;
export type MessageRetention = (typeof MESSAGE_RETENTIONS)[number];

/** Durée appliquée tant que la commune n'a rien choisi */
export const DEFAULT_MESSAGE_RETENTION: MessageRetention = 'months_12';

/** Nombre de mois de chaque durée ; `null` : jamais supprimés automatiquement */
export const MESSAGE_RETENTION_MONTHS: Record<MessageRetention, number | null> = {
  months_6: 6,
  months_12: 12,
  months_24: 24,
  months_36: 36,
  never: null,
};

/** Libellés du réglage (« 1 an ») */
export const MESSAGE_RETENTION_LABELS: Record<MessageRetention, string> = {
  months_6: '6 mois',
  months_12: '1 an',
  months_24: '2 ans',
  months_36: '3 ans',
  never: 'Jamais',
};

export const isMessageRetention = (value: unknown): value is MessageRetention =>
  typeof value === 'string' && (MESSAGE_RETENTIONS as readonly string[]).includes(value);

/** Durée en vigueur : celle choisie par la commune, sinon la valeur par défaut */
export const effectiveMessageRetention = (value: unknown): MessageRetention =>
  isMessageRetention(value) ? value : DEFAULT_MESSAGE_RETENTION;

/** La commune a choisi une durée (point de l'écran Conformité) */
export const isMessageRetentionChosen = (value: unknown): boolean => isMessageRetention(value);

/**
 * Date limite : un message traité dont la dernière modification est antérieure est supprimé.
 * Même jour, N mois plus tôt (dernier jour du mois s'il n'existe pas). `null` : rien n'est supprimé.
 */
export function messageRetentionCutoff(value: unknown, now: Date = new Date()): Date | null {
  const months = MESSAGE_RETENTION_MONTHS[effectiveMessageRetention(value)];
  if (months === null) return null;
  const cutoff = new Date(now);
  const day = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(day, lastDay));
  return cutoff;
}

/**
 * La durée en une phrase, pour l'admin : « Les messages traités sont supprimés automatiquement
 * après 1 an. » ou « Les messages traités ne sont jamais supprimés automatiquement. »
 */
export function messageRetentionSummary(value: unknown): string {
  const retention = effectiveMessageRetention(value);
  return retention === 'never'
    ? 'Les messages traités ne sont jamais supprimés automatiquement.'
    : `Les messages traités sont supprimés automatiquement après ${MESSAGE_RETENTION_LABELS[retention]}.`;
}
