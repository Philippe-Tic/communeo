/**
 * Calage des segments sur la voix réelle :
 * - voix générée segment par segment : chaque segment dure le temps de sa phrase (plus un souffle) ;
 * - piste entière déposée : les passages parlés, séparés par les silences, sont attribués dans l'ordre
 *   aux segments qui ont une voix. Les segments sans voix gardent leur durée prévue.
 */
import type { ScriptVideo, Timings } from './script';

export interface Intervalle {
  debut: number;
  fin: number;
}

/** Pause après chaque phrase, et marge avant la fin d'un passage parlé */
export const SOUFFLE = 0.35;

/** Segments mis bout à bout, chacun à la durée de sa phrase (voix segment par segment) */
export function calerSurPhrases(script: ScriptVideo, durees: Array<number | null>): Timings['segments'] {
  let t = script.segments[0]?.debut ?? 0;
  return script.segments.map((segment, i) => {
    const duree = durees[i];
    const debut = t;
    const fin = debut + (duree === null || duree === undefined ? segment.fin - segment.debut : duree + SOUFFLE);
    t = fin;
    return { debut: round(debut), fin: round(fin) };
  });
}

/**
 * Passages parlés d'une piste d'après ses silences (sortie de silencedetect) : `silences` triés, dans
 * la durée totale de la piste.
 */
export function passagesParles(silences: Intervalle[], duree: number): Intervalle[] {
  const passages: Intervalle[] = [];
  let debut = 0;
  for (const silence of silences) {
    if (silence.debut - debut > 0.15) passages.push({ debut, fin: silence.debut });
    debut = silence.fin;
  }
  if (duree - debut > 0.15) passages.push({ debut, fin: duree });
  return passages;
}

/**
 * Regroupe les passages parlés en `n` blocs : on garde comme frontières les n − 1 silences les plus
 * longs (une virgule marque une pause plus courte qu'un changement de phrase).
 */
export function regrouper(passages: Intervalle[], n: number): Intervalle[] {
  if (passages.length < n) {
    throw new Error(`La piste compte ${passages.length} passages parlés pour ${n} segments avec voix : marquez un silence net (au moins 0,4 s) entre chaque segment`);
  }
  const ecarts = passages.slice(1).map((p, i) => ({ i: i + 1, duree: p.debut - passages[i]!.fin }));
  const coupures = new Set(
    [...ecarts]
      .sort((a, b) => b.duree - a.duree)
      .slice(0, n - 1)
      .map((e) => e.i),
  );
  const blocs: Intervalle[] = [];
  let courant = { ...passages[0]! };
  passages.slice(1).forEach((p, j) => {
    if (coupures.has(j + 1)) {
      blocs.push(courant);
      courant = { ...p };
    } else courant.fin = p.fin;
  });
  blocs.push(courant);
  return blocs;
}

/** Heures des segments d'après les passages parlés d'une piste entière */
export function calerSurPiste(script: ScriptVideo, passages: Intervalle[]): Timings['segments'] {
  const avecVoix = script.segments.filter((s) => s.voix.trim()).length;
  const blocs = regrouper(passages, avecVoix);
  const heures: Timings['segments'] = [];
  let bloc = 0;
  script.segments.forEach((segment, i) => {
    const precedent = heures[i - 1];
    if (segment.voix.trim()) {
      const b = blocs[bloc]!;
      bloc += 1;
      // Le segment commence à la fin du précédent (pas de trou à l'image), sa voix à b.debut
      heures.push({ debut: round(precedent ? precedent.fin : Math.min(b.debut, segment.debut)), fin: round(b.fin + SOUFFLE) });
    } else {
      const debut = precedent ? precedent.fin : segment.debut;
      const suivant = blocs[bloc];
      heures.push({ debut: round(debut), fin: round(suivant ? Math.max(debut, suivant.debut - 0.1) : debut + (segment.fin - segment.debut)) });
    }
  });
  return heures;
}

const round = (n: number) => Math.round(n * 1000) / 1000;
