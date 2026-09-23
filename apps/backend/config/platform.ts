/**
 * Réglages de la plateforme Communeo, communs à toutes les communes.
 * Hébergeur des sites (mentions légales, LCEN art. 6) : renseigné par Communeo, non modifiable par
 * les communes. Vide : les valeurs déjà enregistrées sur chaque site sont conservées.
 */
export default ({ env }: { env: (key: string, fallback?: string) => string }) => ({
  host: {
    name: env('HOSTING_NAME', ''),
    address: env('HOSTING_ADDRESS', ''),
    phone: env('HOSTING_PHONE', ''),
  },
});
