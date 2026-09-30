/** Outils des scripts : lancer un serveur et attendre qu'il réponde, ffmpeg / ffprobe de Remotion */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RACINE = fileURLToPath(new URL('../../../', import.meta.url));
export const VIDEOS = fileURLToPath(new URL('../', import.meta.url));
export const SORTIE_FINALE = fileURLToPath(new URL('../../contenus-site/videos/', import.meta.url));

export const IDS = ['v1-demo', 'v2-alerte', 'v3-themes', 'v5-devis', 'test'] as const;

export function videoDemandee(): string {
  const id = process.argv[2];
  if (!id || !(IDS as readonly string[]).includes(id)) {
    console.error(`Vidéo inconnue : ${id ?? '(aucune)'}. Au choix : ${IDS.join(', ')}`);
    process.exit(1);
  }
  return id;
}

export async function serveur(commande: string, args: string[], url: string, cwd = RACINE): Promise<ChildProcess> {
  // Groupe de processus à part : `arreter` arrête aussi les enfants (pnpm → vite)
  const processus = spawn(commande, args, { cwd, stdio: 'ignore', detached: true });
  for (let essai = 0; essai < 120; essai += 1) {
    try {
      const reponse = await fetch(url);
      if (reponse.status < 500) return processus;
    } catch {
      // pas encore prêt
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  arreter(processus);
  throw new Error(`Le serveur ne répond pas : ${url}`);
}

export function arreter(processus: ChildProcess): void {
  try {
    if (processus.pid) process.kill(-processus.pid, 'SIGTERM');
  } catch {
    // déjà arrêté
  }
}

/** ffmpeg et ffprobe fournis par Remotion (aucune installation système) */
export function remotionOutil(outil: 'ffmpeg' | 'ffprobe', args: string[]): { code: number; stdout: string; stderr: string } {
  const resultat = spawnSync('pnpm', ['exec', 'remotion', outil, ...args], { cwd: VIDEOS, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { code: resultat.status ?? 1, stdout: resultat.stdout, stderr: resultat.stderr };
}

export function dureeAudio(fichier: string): number {
  const { stdout } = remotionOutil('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', fichier]);
  const duree = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(duree)) throw new Error(`Durée illisible : ${fichier}`);
  return duree;
}

export function executer(commande: string, args: string[], cwd = VIDEOS): void {
  const resultat = spawnSync(commande, args, { cwd, stdio: 'inherit' });
  if (resultat.status !== 0) throw new Error(`Échec : ${commande} ${args.join(' ')}`);
}

/** Script et timings d'une vidéo, côté Node */
export async function charger(id: string): Promise<{ script: import('../src/lib/script').ScriptVideo; timings: import('../src/lib/script').Timings; fichierTimings: string }> {
  const { script } = (await import(`../src/videos/${id}/script.ts`)) as { script: import('../src/lib/script').ScriptVideo };
  const fichierTimings = `${VIDEOS}src/videos/${id}/timings.json`;
  const { readFileSync } = await import('node:fs');
  const timings = JSON.parse(readFileSync(fichierTimings, 'utf8')) as import('../src/lib/script').Timings;
  return { script, timings, fichierTimings };
}

/** Dossier de sortie : v2/contenus-site/videos/ pour les vraies vidéos, out/ pour la vidéo de test */
export const dossierSortie = (id: string) => (id === 'test' ? `${VIDEOS}out/` : SORTIE_FINALE);
