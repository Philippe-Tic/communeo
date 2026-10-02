/**
 * Archive ZIP écrite en continu dans un fichier (export des données d'une commune, #343) : les
 * fichiers sont lus un par un au moment de l'écriture, jamais tous chargés en mémoire.
 */
import archiver from 'archiver';
import fs from 'node:fs';
import { finished } from 'node:stream/promises';

/** Déjà compressés : rangés tels quels (les recompresser coûte du temps sans rien gagner) */
const COMPRESSED = /\.(jpe?g|png|gif|webp|avif|heic|mp4|mov|webm|mp3|m4a|zip|gz|7z|rar|pdf|docx|xlsx|pptx|odt|ods|odp|woff2?)$/i;

export interface ZipWriter {
  /** Texte (JSON, CSV, HTML, LISEZMOI) */
  addText(name: string, content: string): void;
  /** Fichier du disque, lu au moment de l'écriture */
  addFile(name: string, sourcePath: string): void;
  /** Dossier entier sous `prefix` ; `skip` écarte des chemins relatifs (règles internes…) */
  addDirectory(sourceDir: string, prefix: string, skip?: (relativePath: string) => boolean): void;
  /** Termine l'archive ; renvoie sa taille en octets */
  finalize(): Promise<number>;
  /** Abandon : flux fermés, fichier partiel laissé à l'appelant */
  abort(): void;
}

export function createZipWriter(file: string): ZipWriter {
  const archive = archiver('zip', { zlib: { level: 6 } });
  const output = fs.createWriteStream(file);
  let failure: unknown = null;
  archive.on('error', (error) => {
    failure = error;
  });
  // Fichier disparu entre la liste et la lecture : erreur, pas un fichier vide en silence
  archive.on('warning', (error) => {
    failure = error;
  });
  archive.pipe(output);
  const done = finished(output);
  done.catch(() => undefined);

  return {
    addText(name, content) {
      archive.append(content, { name });
    },
    addFile(name, sourcePath) {
      const data: archiver.ZipEntryData = { name, store: COMPRESSED.test(name) };
      archive.file(sourcePath, data);
    },
    addDirectory(sourceDir, prefix, skip) {
      archive.directory(sourceDir, prefix, (entry) => {
        if (skip?.(entry.name)) return false;
        const zipEntry: archiver.ZipEntryData = { ...entry, store: COMPRESSED.test(entry.name) };
        return zipEntry;
      });
    },
    async finalize() {
      await archive.finalize();
      await done;
      if (failure) throw failure;
      return archive.pointer();
    },
    abort() {
      archive.abort();
      output.destroy();
    },
  };
}
