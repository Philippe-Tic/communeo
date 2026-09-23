/**
 * Demandes RGPD reçues par le formulaire de contact : la commune doit répondre dans un délai d'un mois
 * à compter de la réception (RGPD, art. 12.3). Même calcul pour l'accusé de réception, le bandeau
 * de l'admin et le délai restant affiché dans la liste des messages.
 */

/** Date à Paris (année, mois 0-11, jour) : un message reçu à 0 h 30 est du jour qui commence, pas de la veille */
function parisDate(date: Date): [number, number, number] {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date)
    .split('-')
    .map(Number) as [number, number, number];
  return [year, month - 1, day];
}

/**
 * Échéance : même jour du mois suivant, à Paris (dernier jour du mois s'il n'existe pas : 31 janvier →
 * 28 ou 29 février). Rendue à midi UTC : la même date partout.
 */
export function rgpdDeadline(receivedAt: Date | string): Date {
  const [year, month, day] = parisDate(new Date(receivedAt));
  const lastDay = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + 1, Math.min(day, lastDay), 12));
}

/** Jours restants avant l'échéance (0 le jour même, négatif une fois dépassée), en jours calendaires à Paris */
export function rgpdDaysLeft(receivedAt: Date | string, now: Date = new Date()): number {
  const day = (date: Date) => {
    const [year, month, dayOfMonth] = parisDate(date);
    return Date.UTC(year, month, dayOfMonth);
  };
  return Math.round((day(rgpdDeadline(receivedAt)) - day(now)) / 86_400_000);
}

/** Modèle de réponse à une demande d'accès (art. 15), à compléter avant l'envoi */
export function rgpdReplyTemplate({ firstName, lastName, siteName }: { firstName: string; lastName: string; siteName: string }): string {
  return [
    `Bonjour ${firstName} ${lastName},`,
    '',
    `Nous avons bien reçu votre demande relative à vos données personnelles, adressée à la mairie de ${siteName}.`,
    '',
    'Vous trouverez ci-joint [les données vous concernant / la confirmation de leur rectification / de leur suppression].',
    '',
    "Si cette réponse ne vous satisfait pas, vous pouvez introduire une réclamation auprès de la CNIL (www.cnil.fr).",
    '',
    'Cordialement,',
    `La mairie de ${siteName}`,
  ].join('\n');
}
