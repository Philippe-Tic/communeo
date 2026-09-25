/**
 * Réglages de la plateforme Communeo, communs à toutes les communes.
 * Hébergeur des sites (mentions légales, LCEN art. 6) : renseigné par Communeo, non modifiable par
 * les communes. Vide : les valeurs déjà enregistrées sur chaque site sont conservées.
 * Émetteur des devis (#312) : identité de Communeo sur le devis et le bon de commande. TVA :
 * `COMMUNEO_VAT_RATE=0` en franchise en base (micro-entreprise, art. 293 B du CGI), 0.2 sinon.
 */
export default ({ env }: { env: (key: string, fallback?: string) => string }) => ({
  host: {
    name: env('HOSTING_NAME', ''),
    address: env('HOSTING_ADDRESS', ''),
    phone: env('HOSTING_PHONE', ''),
  },
  issuer: {
    name: env('COMMUNEO_LEGAL_NAME', ''),
    address: env('COMMUNEO_LEGAL_ADDRESS', ''),
    siret: env('COMMUNEO_SIRET', ''),
    email: env('COMMUNEO_BILLING_EMAIL', ''),
    vatRate: Number(env('COMMUNEO_VAT_RATE', '0')) || 0,
  },
});
