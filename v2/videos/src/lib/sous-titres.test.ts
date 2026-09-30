import { describe, expect, it } from 'vitest';
import { chronologie, type ScriptVideo } from './script';
import { blocs, lignes, LIGNE_MAX, transcription, vtt } from './sous-titres';

const script: ScriptVideo = {
  id: 'essai',
  titre: 'Essai',
  apercu: 1,
  segments: [
    { debut: 0, fin: 4, voix: 'Vous publiez l’alerte depuis l’administration, avec un niveau de gravité et une date de fin.', ecran: 'L’écran Alertes.' },
    { debut: 4, fin: 5, voix: '', ecran: 'Fondu.' },
    { debut: 5, fin: 7, voix: 'Le bandeau apparaît.', ecran: 'Le téléphone.' },
  ],
};

describe('sous-titres', () => {
  it('coupe en lignes de 42 caractères sans couper les mots', () => {
    const texte = script.segments[0]!.voix;
    const resultat = lignes(texte);
    expect(resultat.every((ligne) => ligne.length <= LIGNE_MAX)).toBe(true);
    expect(resultat.join(' ')).toBe(texte);
  });

  it('ne dépasse jamais 2 lignes par sous-titre', () => {
    const long = 'Un. '.repeat(10) + 'Une phrase bien plus longue que quarante-deux caractères pour vérifier le découpage des blocs.';
    expect(blocs(long).every((bloc) => bloc.length <= 2)).toBe(true);
  });

  it('génère un WebVTT calé sur les segments, sans les silences', () => {
    const texte = vtt(chronologie(script));
    expect(texte.startsWith('WEBVTT')).toBe(true);
    expect(texte).toContain('00:00:00.000 --> ');
    expect(texte).toContain('00:00:05.000 --> 00:00:07.000\nLe bandeau apparaît.');
    expect(texte).not.toContain('Fondu');
    for (const ligne of texte.split('\n')) expect(ligne.length).toBeLessThanOrEqual(LIGNE_MAX + 20);
  });

  it('écrit la transcription : voix et écran de chaque segment', () => {
    const texte = transcription('Essai', chronologie(script));
    expect(texte).toContain('**0:00**. « Vous publiez');
    expect(texte).toContain('(sans parole)');
    expect(texte).toContain('_À l\'écran : Le téléphone._');
  });

  it('prend les heures de timings.json quand elles correspondent au script', () => {
    const segments = chronologie(script, { source: 'piste', audio: null, segments: [{ debut: 0.5, fin: 3 }, { debut: 3, fin: 3.5 }, { debut: 4, fin: 6 }] });
    expect(segments[2]).toMatchObject({ debut: 4, fin: 6, de: 120, a: 180 });
  });
});
