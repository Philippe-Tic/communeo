import { describe, expect, it } from 'vitest';
import { chronologie, type ScriptVideo } from './script';
import { blocs, lignes, LIGNE_MAX, phrases, transcription, vtt } from './sous-titres';

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

  it('coupe par phrase : jamais un mot seul, jamais une phrase à cheval sur deux sous-titres', () => {
    const texte = 'Un aperçu pour vérifier, puis « Mettre en ligne ». Communeo vous guide à chaque étape.';
    expect(phrases(texte)).toEqual(['Un aperçu pour vérifier, puis « Mettre en ligne ».', 'Communeo vous guide à chaque étape.']);
    expect(blocs(texte)).toEqual([['Un aperçu pour vérifier,', 'puis « Mettre en ligne ».'], ['Communeo vous guide à chaque étape.']]);
  });

  it('coupe une longue phrase après une ponctuation, en lignes équilibrées', () => {
    const texte = 'Communeo récupère tout seul les informations publiques : l’adresse de la mairie, les horaires, la population.';
    const resultat = blocs(texte);
    expect(resultat.every((b) => b.length <= 2 && b.every((l) => l.length <= LIGNE_MAX))).toBe(true);
    expect(resultat[0]!.join(' ')).toBe('Communeo récupère tout seul les informations publiques :');
  });

  it('cale chaque phrase sur son passage dans la voix', () => {
    const segments = chronologie(
      { ...script, segments: [{ debut: 0, fin: 6, voix: 'Première phrase. Deuxième phrase.', ecran: 'A' }] },
      { source: 'systeme', audio: null, segments: [{ debut: 0, fin: 6, parole: { debut: 0.4, fin: 4, phrases: [{ debut: 0.4, fin: 1.6 }, { debut: 2.4, fin: 4 }] } }] },
    );
    const texte = vtt(segments);
    expect(texte).toContain('00:00:00.400 --> 00:00:01.600\nPremière phrase.');
    expect(texte).toContain('00:00:02.400 --> 00:00:04.000\nDeuxième phrase.');
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

  it('cale le sous-titre sur la voix, pas sur toute la scène', () => {
    const segments = chronologie(script, { source: 'elevenlabs', audio: null, segments: [{ debut: 0, fin: 6, parole: { debut: 0.4, fin: 4.2 } }, { debut: 6, fin: 7 }, { debut: 7, fin: 10, parole: { debut: 7.4, fin: 8.6 } }] });
    const texte = vtt(segments);
    expect(texte).toContain('00:00:00.400 --> ');
    expect(texte).toContain('00:00:07.400 --> 00:00:08.600\nLe bandeau apparaît.');
  });

  it('prend les heures de timings.json quand elles correspondent au script', () => {
    const segments = chronologie(script, { source: 'piste', audio: null, segments: [{ debut: 0.5, fin: 3 }, { debut: 3, fin: 3.5 }, { debut: 4, fin: 6 }] });
    expect(segments[2]).toMatchObject({ debut: 4, fin: 6, de: 120, a: 180 });
  });
});
