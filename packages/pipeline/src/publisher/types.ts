/**
 * Publication d'un site généré chez un hébergeur. Tout ce qui dépend de l'hébergeur (API, cibles DNS,
 * certificats) vit dans un adaptateur : changer d'hébergeur (VPS + Caddy, Cloudflare Pages…) ne touche
 * que ce dossier.
 */

/** La commune telle que l'adaptateur la voit : jamais un document Strapi entier. */
export interface PublisherSite {
  /** documentId Strapi du site */
  documentId: string;
  slug: string;
  name: string;
  /** Identifiant du site chez l'hébergeur, absent avant la première publication */
  hostId?: string | null;
  /** Domaine personnalisé vérifié : l'adresse par défaut de l'hébergeur y redirige */
  customDomain?: string | null;
}

export type DeployState = 'building' | 'ready' | 'error';

export interface HostSite {
  hostId: string;
  /** Adresse par défaut chez l'hébergeur, en https (ex. https://lyon-mairie.netlify.app) */
  defaultUrl: string;
}

export interface PublishResult extends HostSite {
  deployId: string;
  /** `building` si l'hébergeur n'a pas fini de traiter le dépôt dans le délai d'attente */
  state: DeployState;
}

export interface DeployStatus {
  state: DeployState;
  error?: string;
}

export interface DnsRecord {
  type: 'A' | 'AAAA' | 'CNAME';
  /** Nom complet (ex. www.mairie-lyon.fr) */
  name: string;
  /** Nom à saisir chez le fournisseur DNS (`@` pour l'apex) */
  displayName: string;
  value: string;
  purpose: string;
  description: string;
}

export interface DnsInstructions {
  isApex: boolean;
  baseDomain: string;
  /** Cible à donner au CNAME (ex. lyon-mairie.netlify.app) */
  target: string;
  records: DnsRecord[];
}

export interface DomainCheck {
  /** Le domaine pointe vers l'hébergeur (et le certificat HTTPS est demandé) */
  ok: boolean;
  errors: string[];
  /** Domaine non pointé : l'enregistrement attendu et ce que le DNS renvoie (vide : aucun) */
  mismatch?: { type: DnsRecord['type']; name: string; expected: string; found: string[] };
}

export interface SitePublisher {
  /** Identifiant de l'hébergeur (ex. `netlify`) */
  readonly id: string;
  /** Vrai si l'adaptateur a ce qu'il lui faut (jeton…) pour appeler l'hébergeur */
  readonly configured: boolean;

  /** Crée le site chez l'hébergeur s'il n'existe pas encore (idempotent). */
  ensureSite(site: PublisherSite): Promise<HostSite>;
  /**
   * Publie en production le contenu du dossier `dir` (le site statique généré). `onUploaded` est
   * appelé quand les fichiers sont chez l'hébergeur, avant qu'il ait fini de les traiter.
   */
  publish(site: PublisherSite, dir: string, options?: { onUploaded?: () => Promise<void> | void }): Promise<PublishResult>;
  /** État d'un dépôt renvoyé par `publish`. */
  status(deployId: string): Promise<DeployStatus>;

  /** Rattache un domaine personnalisé au site et renvoie les enregistrements DNS à créer. */
  configureDomain(site: PublisherSite, domain: string): Promise<DnsInstructions>;
  /** Enregistrements DNS à créer pour un domaine déjà rattaché (sans modifier l'hébergeur). */
  dnsInstructions(site: PublisherSite, domain: string): Promise<DnsInstructions>;
  /** Vérifie que le domaine pointe vers l'hébergeur ; si oui, active HTTPS. */
  verifyDomain(site: PublisherSite, domain: string): Promise<DomainCheck>;
  /** Détache le domaine ; renvoie l'adresse par défaut du site. */
  removeDomain(site: PublisherSite, domain: string): Promise<{ defaultUrl: string | null }>;
  /** État du certificat HTTPS tel que l'hébergeur le décrit, `null` si inconnu. */
  certificateStatus(site: PublisherSite): Promise<unknown | null>;

  /** Supprime le site chez l'hébergeur. */
  deleteSite(site: PublisherSite): Promise<void>;
}
