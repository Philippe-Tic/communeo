/**
 * Données publiques d'une commune (#150, assistant de création) : ce que renvoient
 * geo.api.gouv.fr (nom, code INSEE, codes postaux, population, coordonnées) et l'Annuaire de
 * l'administration (mairie : adresse, téléphone, e-mail, horaires, SIRET), converti vers les
 * réglages du Site. Fonctions pures : la lecture des API est faite par le serveur.
 */
import { WEEKDAYS, emptyOpeningHours, type OpeningHours, type Weekday } from './opening-status';

export interface CommuneMatch {
  name: string;
  insee: string;
  postalCodes: string[];
  population: number | null;
  department: string | null;
}

export interface CommuneDetails extends CommuneMatch {
  latitude: number | null;
  longitude: number | null;
  /** Mairie, d'après l'Annuaire de l'administration (null : pas trouvée) */
  townHall: {
    address: string | null;
    phone: string | null;
    email: string | null;
    siret: string | null;
    hours: OpeningHours | null;
  } | null;
}

/** Une commune de geo.api.gouv.fr (champs nom, code, codesPostaux, population, centre, departement) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- réponse d'une API externe, lue champ par champ
export function fromGeo(record: any): CommuneMatch & { latitude: number | null; longitude: number | null } {
  const [longitude, latitude] = Array.isArray(record?.centre?.coordinates) ? record.centre.coordinates : [null, null];
  return {
    name: String(record?.nom ?? ''),
    insee: String(record?.code ?? ''),
    postalCodes: Array.isArray(record?.codesPostaux) ? record.codesPostaux.map(String) : [],
    population: typeof record?.population === 'number' ? record.population : null,
    department: record?.departement?.nom ?? null,
    latitude: typeof latitude === 'number' ? latitude : null,
    longitude: typeof longitude === 'number' ? longitude : null,
  };
}

const DAY_NAMES: Record<string, Weekday> = {
  lundi: 'monday',
  mardi: 'tuesday',
  mercredi: 'wednesday',
  jeudi: 'thursday',
  vendredi: 'friday',
  samedi: 'saturday',
  dimanche: 'sunday',
};

const time = (value: unknown) => (typeof value === 'string' && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : null);

/** Les champs JSON de l'Annuaire arrivent parfois en texte */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- champs JSON d'une API externe
const list = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
};

/** Horaires de l'Annuaire (plage_ouverture) → horaires du Site ; null si rien d'exploitable */
export function hoursFromAnnuaire(value: unknown): OpeningHours | null {
  const hours = emptyOpeningHours();
  let found = false;
  for (const range of list(value)) {
    const from = DAY_NAMES[String(range?.nom_jour_debut ?? '').toLowerCase()];
    const to = DAY_NAMES[String(range?.nom_jour_fin ?? range?.nom_jour_debut ?? '').toLowerCase()];
    if (!from || !to) continue;
    const slots = [
      [time(range.valeur_heure_debut_1), time(range.valeur_heure_fin_1)],
      [time(range.valeur_heure_debut_2), time(range.valeur_heure_fin_2)],
    ]
      .filter(([open, close]) => open && close && open < close)
      .map(([open, close]) => ({ open: open!, close: close! }));
    if (!slots.length) continue;
    for (let index = WEEKDAYS.indexOf(from); index <= WEEKDAYS.indexOf(to); index += 1) {
      hours.days[WEEKDAYS[index]!] = [...hours.days[WEEKDAYS[index]!], ...slots].sort((a, b) => a.open.localeCompare(b.open));
      found = true;
    }
  }
  return found ? hours : null;
}

/** La mairie dans l'Annuaire (enregistrement de api-lannuaire-administration) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- réponse d'une API externe, lue champ par champ
export function townHallFromAnnuaire(record: any): NonNullable<CommuneDetails['townHall']> {
  const [address] = list(record?.adresse).filter((entry) => !entry?.type_adresse || entry.type_adresse === 'Adresse');
  const street = [address?.numero_voie, address?.complement1, address?.complement2].filter((part) => part && String(part).trim());
  const city = [address?.code_postal, address?.nom_commune].filter(Boolean).join(' ');
  const [phone] = list(record?.telephone);
  const email = typeof record?.adresse_courriel === 'string' ? record.adresse_courriel.split(';')[0]!.trim() : '';
  const siret = String(record?.siret ?? '').replace(/\s/g, '');
  return {
    address: street.length || city ? [street.join(', '), city].filter(Boolean).join(', ') : null,
    phone: phone?.valeur ? String(phone.valeur) : null,
    email: email || null,
    siret: /^\d{14}$/.test(siret) ? siret : null,
    hours: hoursFromAnnuaire(record?.plage_ouverture),
  };
}
