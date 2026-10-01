/**
 * Inscriptions de test (SIGNUP_TEST_EMAILS) : l'équipe teste le parcours d'un vrai client en
 * production (inscription, assistant, essai, devis) sans écrire à une vraie mairie.
 *
 * Variable : adresses ou domaines (`@communeo.fr`), séparés par des virgules. Pour ces adresses,
 * l'adresse officielle de la mairie (Annuaire) n'est jamais utilisée : la demande d'approbation va à
 * l'équipe (« À valider ») au lieu de la mairie, le contact du site est l'adresse du testeur et
 * l'assistant ne pré-remplit pas l'e-mail de la mairie (les messages du formulaire de contact du site
 * de test n'arriveraient pas chez elle). Aucune facture tant que l'équipe n'approuve pas le passage
 * en live.
 */
export function isTestAddress(email: string | null | undefined): boolean {
  const address = email?.trim().toLowerCase();
  if (!address) return false;
  return (process.env.SIGNUP_TEST_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => (entry.startsWith('@') ? address.endsWith(entry) : address === entry));
}
