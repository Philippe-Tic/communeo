/**
 * Petit synthétiseur pour la musique de fond : tout est calculé ici (aucun échantillon, aucune banque
 * de sons), la musique est donc libre de droits par construction. Stéréo, 44,1 kHz, flottants.
 *
 * Instruments : corde pincée (Karplus-Strong), nappe additive, basse, grosse caisse, charleston,
 * claquement, clochette, souffle de transition ; réverbération de Schroeder sur un bus d'envoi.
 */
export const TAUX = 44100;

/** Bruit pseudo-aléatoire reproductible : la même commande produit toujours la même musique */
export function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const frequence = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Piste {
  readonly g: Float32Array;
  readonly d: Float32Array;
  constructor(readonly duree: number) {
    const n = Math.ceil(duree * TAUX);
    this.g = new Float32Array(n);
    this.d = new Float32Array(n);
  }
  get longueur(): number {
    return this.g.length;
  }
  /** Ajoute un échantillon à l'index `i`, placé dans l'espace stéréo (`pan` de -1 à 1) */
  ajouter(i: number, valeur: number, pan = 0): void {
    if (i < 0 || i >= this.g.length) return;
    this.g[i]! += valeur * Math.min(1, 1 - pan);
    this.d[i]! += valeur * Math.min(1, 1 + pan);
  }
  mixer(autre: Piste, gain = 1): void {
    for (let i = 0; i < this.g.length; i += 1) {
      this.g[i]! += autre.g[i]! * gain;
      this.d[i]! += autre.d[i]! * gain;
    }
  }
}

const aleatoire = hasard(7);

/** Corde pincée (Karplus-Strong) : son de guitare ou de harpe, qui s'éteint seul */
export function pincer(piste: Piste, t: number, midi: number, gain: number, pan = 0, duree = 1.6): void {
  const periode = TAUX / frequence(midi);
  const n = Math.max(2, Math.round(periode));
  const tampon = new Float32Array(n);
  // Attaque adoucie : bruit filtré (moins métallique)
  let precedent = 0;
  for (let k = 0; k < n; k += 1) {
    precedent = precedent * 0.55 + (aleatoire() * 2 - 1) * 0.45;
    tampon[k] = precedent;
  }
  const debut = Math.round(t * TAUX);
  const total = Math.round(duree * TAUX);
  let k = 0;
  for (let i = 0; i < total; i += 1) {
    const suivant = (k + 1) % n;
    const sortie = tampon[k]!;
    tampon[k] = (tampon[k]! + tampon[suivant]!) * 0.5 * 0.9985;
    k = suivant;
    const fin = Math.min(1, (total - i) / (0.03 * TAUX));
    piste.ajouter(debut + i, sortie * gain * fin, pan);
  }
}

/** Nappe : accord tenu, harmoniques douces, deux voix désaccordées (gauche, droite) */
export function nappe(piste: Piste, t: number, duree: number, notes: number[], gain: number): void {
  const debut = Math.round(t * TAUX);
  const attaque = 0.35;
  const relache = 0.6;
  const total = Math.round((duree + relache) * TAUX);
  for (const midi of notes) {
    for (const [desaccord, pan] of [
      [-6, -0.7],
      [6, 0.7],
    ] as const) {
      const f = frequence(midi + desaccord / 100);
      for (let i = 0; i < total; i += 1) {
        const s = i / TAUX;
        const env = Math.min(1, s / attaque) * (s > duree ? Math.max(0, 1 - (s - duree) / relache) : 1);
        if (env <= 0) continue;
        const phase = 2 * Math.PI * f * s;
        const v = Math.sin(phase) + 0.25 * Math.sin(2 * phase) + 0.08 * Math.sin(3 * phase) + 0.03 * Math.sin(4 * phase);
        piste.ajouter(debut + i, v * env * gain, pan);
      }
    }
  }
}

/** Basse ronde : sinus et un peu d'octave (audible sur de petits haut-parleurs) */
export function basse(piste: Piste, t: number, midi: number, duree: number, gain: number): void {
  const f = frequence(midi);
  const debut = Math.round(t * TAUX);
  const total = Math.round(duree * TAUX);
  for (let i = 0; i < total; i += 1) {
    const s = i / TAUX;
    const env = Math.min(1, s / 0.006) * Math.exp(-s / 0.45) * Math.min(1, (total - i) / (0.04 * TAUX));
    const phase = 2 * Math.PI * f * s;
    piste.ajouter(debut + i, (Math.sin(phase) + 0.35 * Math.sin(2 * phase)) * env * gain);
  }
}

/** Grosse caisse feutrée */
export function caisse(piste: Piste, t: number, gain: number): void {
  const debut = Math.round(t * TAUX);
  let phase = 0;
  for (let i = 0; i < 0.35 * TAUX; i += 1) {
    const s = i / TAUX;
    phase += (2 * Math.PI * (48 + 70 * Math.exp(-s / 0.028))) / TAUX;
    piste.ajouter(debut + i, Math.sin(phase) * Math.exp(-s / 0.16) * Math.min(1, s / 0.002) * gain);
  }
}

/** Charleston fermé : bruit très aigu, bref */
export function charleston(piste: Piste, t: number, gain: number, pan = 0.3): void {
  const debut = Math.round(t * TAUX);
  let precedent = 0;
  for (let i = 0; i < 0.06 * TAUX; i += 1) {
    const bruit = aleatoire() * 2 - 1;
    const aigu = bruit - precedent;
    precedent = bruit;
    piste.ajouter(debut + i, aigu * Math.exp(-i / TAUX / 0.018) * gain, pan);
  }
}

/** Filtre passe-bande (variable d'état), pour le claquement et le souffle */
class PasseBande {
  private bas = 0;
  private bande = 0;
  pas(entree: number, f: number, q: number): number {
    const coef = 2 * Math.sin((Math.PI * f) / TAUX);
    const haut = entree - this.bas - q * this.bande;
    this.bande += coef * haut;
    this.bas += coef * this.bande;
    return this.bande;
  }
}

/** Claquement de doigts / main, sur les temps 2 et 4 */
export function claquement(piste: Piste, t: number, gain: number): void {
  const debut = Math.round(t * TAUX);
  const filtre = new PasseBande();
  for (let i = 0; i < 0.18 * TAUX; i += 1) {
    const s = i / TAUX;
    const corps = Math.sin(2 * Math.PI * 185 * s) * Math.exp(-s / 0.03) * 0.5;
    const bruit = filtre.pas(aleatoire() * 2 - 1, 1700, 0.9) * Math.exp(-s / 0.05);
    piste.ajouter(debut + i, (corps + bruit) * gain, -0.15);
  }
}

/** Clochette (glockenspiel) : sinus et partiel aigu, extinction rapide */
export function clochette(piste: Piste, t: number, midi: number, gain: number, pan = 0): void {
  const f = frequence(midi);
  const debut = Math.round(t * TAUX);
  for (let i = 0; i < 1.4 * TAUX; i += 1) {
    const s = i / TAUX;
    const v = Math.sin(2 * Math.PI * f * s) * Math.exp(-s / 0.5) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * s) * Math.exp(-s / 0.12);
    piste.ajouter(debut + i, v * Math.min(1, s / 0.002) * gain, pan);
  }
}

/**
 * Souffle de transition : bruit dont la bande monte, qui enfle jusqu'à `pic` (en secondes après `t`)
 * et passe de droite à gauche, comme l'écran qui glisse.
 */
export function souffle(piste: Piste, t: number, duree: number, pic: number, gain: number): void {
  const debut = Math.round(t * TAUX);
  const filtre = new PasseBande();
  for (let i = 0; i < duree * TAUX; i += 1) {
    const s = i / TAUX;
    const avance = s / duree;
    const f = 350 * (4200 / 350) ** avance;
    const env = s < pic ? (s / pic) ** 2 : Math.exp(-(s - pic) / 0.09);
    const v = filtre.pas(aleatoire() * 2 - 1, f, 0.6);
    piste.ajouter(debut + i, v * env * gain, 0.6 - 1.2 * avance);
  }
}

/** Réverbération de Schroeder (4 filtres en peigne, 2 passe-tout), par canal */
export function reverberer(piste: Piste, taille = 0.82, amorti = 0.35): Piste {
  const sortie = new Piste(piste.duree);
  for (const [canal, cible, ecart] of [
    [piste.g, sortie.g, 0],
    [piste.d, sortie.d, 23],
  ] as const) {
    const peignes = [1116, 1188, 1277, 1356].map((n) => ({ tampon: new Float32Array(n + ecart), k: 0, filtre: 0 }));
    const passeTout = [556, 441].map((n) => ({ tampon: new Float32Array(n + ecart), k: 0 }));
    for (let i = 0; i < canal.length; i += 1) {
      const x = canal[i]! * 0.015;
      let somme = 0;
      for (const p of peignes) {
        const y = p.tampon[p.k]!;
        p.filtre = y * (1 - amorti) + p.filtre * amorti;
        p.tampon[p.k] = x + p.filtre * taille;
        p.k = (p.k + 1) % p.tampon.length;
        somme += y;
      }
      for (const a of passeTout) {
        const y = a.tampon[a.k]!;
        a.tampon[a.k] = somme + y * 0.5;
        a.k = (a.k + 1) % a.tampon.length;
        somme = y - somme;
      }
      cible[i] = somme;
    }
  }
  return sortie;
}

/** Niveau efficace (RMS) d'un signal, sur ses passages non silencieux */
export function niveau(echantillons: Float32Array | number[]): number {
  let somme = 0;
  let n = 0;
  for (const v of echantillons) {
    if (Math.abs(v) < 1e-4) continue;
    somme += v * v;
    n += 1;
  }
  return n ? Math.sqrt(somme / n) : 0;
}

/** WAV 16 bits stéréo */
export function wav(piste: Piste): Buffer {
  const n = piste.longueur;
  const tampon = Buffer.alloc(44 + n * 4);
  tampon.write('RIFF', 0);
  tampon.writeUInt32LE(36 + n * 4, 4);
  tampon.write('WAVEfmt ', 8);
  tampon.writeUInt32LE(16, 16);
  tampon.writeUInt16LE(1, 20);
  tampon.writeUInt16LE(2, 22);
  tampon.writeUInt32LE(TAUX, 24);
  tampon.writeUInt32LE(TAUX * 4, 28);
  tampon.writeUInt16LE(4, 32);
  tampon.writeUInt16LE(16, 34);
  tampon.write('data', 36);
  tampon.writeUInt32LE(n * 4, 40);
  const borne = (v: number) => Math.max(-32767, Math.min(32767, Math.round(v * 32767)));
  for (let i = 0; i < n; i += 1) {
    tampon.writeInt16LE(borne(piste.g[i]!), 44 + i * 4);
    tampon.writeInt16LE(borne(piste.d[i]!), 46 + i * 4);
  }
  return tampon;
}
