import { describe, expect, it } from 'vitest';
import { fromGeo, hoursFromAnnuaire, townHallFromAnnuaire } from './public-data';

// Extraits réels des API (Saint-Pierre-le-Moûtier, 58264)
const geo = {
  nom: 'Saint-Pierre-le-Moûtier',
  code: '58264',
  codesPostaux: ['58240'],
  population: 1823,
  centre: { type: 'Point', coordinates: [3.1374, 46.7915] },
  departement: { code: '58', nom: 'Nièvre' },
};
const annuaire = {
  nom: 'Mairie - Saint-Pierre-le-Moûtier',
  adresse: JSON.stringify([
    { type_adresse: 'Adresse', complement1: '', complement2: '', numero_voie: "33 place de l'Église", code_postal: '58240', nom_commune: 'Saint-Pierre-le-Moûtier' },
  ]),
  telephone: [{ valeur: '03 86 90 19 94', description: '' }],
  adresse_courriel: 'mairie@saintpierrelemoutier.fr',
  siret: '21580264600012',
  plage_ouverture: [
    { nom_jour_debut: 'Lundi', nom_jour_fin: 'Lundi', valeur_heure_debut_1: '09:00:00', valeur_heure_fin_1: '12:00:00', valeur_heure_debut_2: '14:00:00', valeur_heure_fin_2: '17:00:00' },
    { nom_jour_debut: 'Mardi', nom_jour_fin: 'Vendredi', valeur_heure_debut_1: '14:00:00', valeur_heure_fin_1: '17:00:00', valeur_heure_debut_2: '', valeur_heure_fin_2: '' },
  ],
};

describe('données publiques', () => {
  it('geo.api.gouv.fr : nom, INSEE, population, coordonnées (lat/long dans le bon ordre)', () => {
    expect(fromGeo(geo)).toEqual({
      name: 'Saint-Pierre-le-Moûtier',
      insee: '58264',
      postalCodes: ['58240'],
      population: 1823,
      department: 'Nièvre',
      latitude: 46.7915,
      longitude: 3.1374,
    });
  });

  it('Annuaire : adresse, téléphone, e-mail, SIRET, horaires (plages de jours comprises)', () => {
    const hall = townHallFromAnnuaire(annuaire);
    expect(hall).toMatchObject({
      address: "33 place de l'Église, 58240 Saint-Pierre-le-Moûtier",
      phone: '03 86 90 19 94',
      email: 'mairie@saintpierrelemoutier.fr',
      siret: '21580264600012',
    });
    expect(hall.hours!.days.monday).toEqual([
      { open: '09:00', close: '12:00' },
      { open: '14:00', close: '17:00' },
    ]);
    expect(hall.hours!.days.thursday).toEqual([{ open: '14:00', close: '17:00' }]);
    expect(hall.hours!.days.saturday).toEqual([]);
  });

  it('données absentes ou incomplètes : null plutôt qu’une valeur fausse', () => {
    expect(hoursFromAnnuaire([])).toBeNull();
    expect(hoursFromAnnuaire('pas du json')).toBeNull();
    expect(townHallFromAnnuaire({ siret: '123' })).toEqual({ address: null, phone: null, email: null, siret: null, hours: null });
  });
});
