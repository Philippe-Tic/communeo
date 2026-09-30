import { describe, expect, it } from 'vitest';
import { calerSurPhrases, calerSurPiste, couperEnPhrases, passagesParles, regrouper } from './calage';
import type { ScriptVideo } from './script';

const script: ScriptVideo = {
  id: 'essai',
  titre: 'Essai',
  apercu: 1,
  segments: [
    { debut: 0, fin: 4, voix: 'Première phrase, avec une virgule.', ecran: 'A' },
    { debut: 4, fin: 8, voix: 'Deuxième phrase.', ecran: 'B' },
    { debut: 8, fin: 10, voix: '', ecran: 'Carte de fin' },
  ],
};

describe('calage sur la voix', () => {
  it('met les segments bout à bout : la durée de la phrase, jamais moins que la durée prévue', () => {
    // Prévu : 4 s, 4 s, 2 s ; voix : 4,5 s (plus longue que prévu) et 1,5 s (plus courte)
    const heures = calerSurPhrases(script, [4.5, 1.5, null]);
    expect(heures).toEqual([
      { debut: 0, fin: 5.25, parole: { debut: 0.4, fin: 4.9 } },
      { debut: 5.25, fin: 9.25, parole: { debut: 5.65, fin: 7.15 } },
      { debut: 9.25, fin: 11.25 },
    ]);
  });

  it('arrondit chaque scène au temps de musique suivant quand le script a un tempo', () => {
    // 100 battements par minute : un temps = 0,6 s
    const heures = calerSurPhrases({ ...script, tempo: 100 }, [4.5, 1.5, null]);
    expect(heures.map((h) => [h.debut, h.fin])).toEqual([
      [0, 5.4],
      [5.4, 9.6],
      [9.6, 12],
    ]);
  });

  it('retrouve les passages parlés entre les silences', () => {
    expect(passagesParles([{ debut: 0, fin: 0.5 }, { debut: 2, fin: 2.2 }, { debut: 3, fin: 4 }], 6)).toEqual([
      { debut: 0.5, fin: 2 },
      { debut: 2.2, fin: 3 },
      { debut: 4, fin: 6 },
    ]);
  });

  it('coupe sur les silences les plus longs (une virgule ne sépare pas deux segments)', () => {
    const passages = [
      { debut: 0.5, fin: 1.5 },
      { debut: 1.7, fin: 3 }, // virgule : 0,2 s
      { debut: 4, fin: 5 }, // changement de segment : 1 s
    ];
    expect(regrouper(passages, 2)).toEqual([
      { debut: 0.5, fin: 3 },
      { debut: 4, fin: 5 },
    ]);
    expect(() => regrouper(passages, 4)).toThrow(/3 passages parlés pour 4 segments/);
  });

  it('coupe les phrases sur le silence le plus proche de l’endroit attendu, pas le plus long', () => {
    // « Communeo : (longue pause) trente jours gratuits, sans engagement. (pause) Rendez-vous sur communeo.fr. »
    const passages = [
      { debut: 0, fin: 0.6 },
      { debut: 1.1, fin: 2.9 },
      { debut: 3.2, fin: 5.4 },
    ];
    expect(couperEnPhrases(passages, [50, 28])).toEqual([
      { debut: 0, fin: 2.9 },
      { debut: 3.2, fin: 5.4 },
    ]);
    expect(couperEnPhrases(passages.slice(0, 1), [10, 10])).toBeNull();
  });

  it('cale les segments sur une piste entière, les segments muets gardent leur durée', () => {
    const heures = calerSurPiste(script, [
      { debut: 0.4, fin: 1.4 },
      { debut: 1.6, fin: 3.1 },
      { debut: 4.2, fin: 5.6 },
    ]);
    // SOUFFLE = 0,35 s après chaque passage parlé
    expect(heures).toEqual([
      { debut: 0, fin: 3.45, parole: { debut: 0.4, fin: 3.1 } },
      { debut: 3.45, fin: 5.95, parole: { debut: 4.2, fin: 5.6 } },
      { debut: 5.95, fin: 7.95 },
    ]);
  });
});
