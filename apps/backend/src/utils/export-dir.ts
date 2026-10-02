/**
 * Dossier des archives d'export des communes (#343) : `EXPORT_DIR` (volume `exports` en production),
 * sinon `.tmp/exports` du projet. Jamais sous `public/` : une archive contient des données personnelles
 * et ne se télécharge que par l'administration, connecté.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

export const exportDir = (): string => process.env.EXPORT_DIR || path.join(strapi.dirs.app.root, '.tmp', 'exports');

/** Chemin d'une archive à partir du nom gardé sur le Site (jamais un chemin : nom seul) */
export const exportPath = (file: string): string => path.join(exportDir(), path.basename(file));

/** Efface l'archive (et sa version en cours d'écriture) ; absente : rien à faire */
export async function removeExportFile(file: string | null | undefined): Promise<void> {
  if (!file) return;
  await fs.rm(exportPath(file), { force: true });
  await fs.rm(`${exportPath(file)}.partiel`, { force: true });
}
