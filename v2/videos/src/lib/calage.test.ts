import { describe, expect, it } from 'vitest';
import { calerSurPhrases, calerSurPiste, passagesParles, regrouper, SOUFFLE } from './calage';
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
  it('met les segments bout à bout à la durée de leur phrase', () => {
    const heures = calerSurPhrases(script, [3, 1.5, null]);
    expect(heures).toEqual([
      { debut: 0, fin: 3 + SOUFFLE },
      { debut: 3 + SOUFFLE, fin: 4.5 + 2 * SOUFFLE },
      { debut: 4.5 + 2 * SOUFFLE, fin: 6.5 + 2 * SOUFFLE },
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

  it('cale les segments sur une piste entière, les segments muets gardent leur durée', () => {
    const heures = calerSurPiste(script, [
      { debut: 0.4, fin: 1.4 },
      { debut: 1.6, fin: 3.1 },
      { debut: 4.2, fin: 5.6 },
    ]);
    // SOUFFLE = 0,35 s après chaque passage parlé
    expect(heures).toEqual([
      { debut: 0, fin: 3.45 },
      { debut: 3.45, fin: 5.95 },
      { debut: 5.95, fin: 7.95 },
    ]);
  });
});
