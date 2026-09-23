/**
 * Contrôle des fichiers envoyés dans la médiathèque. Le type déclaré par le navigateur ne suffit pas
 * (un fichier HTML déclaré « image/png » serait servi en HTML) : l'extension doit correspondre au
 * type, et le contenu à la signature du format. Les SVG sont nettoyés (scripts, gestionnaires
 * d'événements, contenus étrangers, liens externes) avant d'être enregistrés.
 */
import DOMPurify from 'isomorphic-dompurify';

interface Format {
  label: string;
  extensions: string[];
  /** Vérifie les premiers octets du fichier */
  signature: (head: Buffer) => boolean;
}

const starts = (head: Buffer, bytes: number[], offset = 0) => bytes.every((byte, index) => head[offset + index] === byte);
const ZIP = (head: Buffer) => starts(head, [0x50, 0x4b, 0x03, 0x04]);
const OLE = (head: Buffer) => starts(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

export const MEDIA_FORMATS: Record<string, Format> = {
  'image/jpeg': { label: 'JPG', extensions: ['.jpg', '.jpeg'], signature: (head) => starts(head, [0xff, 0xd8, 0xff]) },
  'image/png': { label: 'PNG', extensions: ['.png'], signature: (head) => starts(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  'image/webp': { label: 'WebP', extensions: ['.webp'], signature: (head) => starts(head, [0x52, 0x49, 0x46, 0x46]) && starts(head, [0x57, 0x45, 0x42, 0x50], 8) },
  'image/svg+xml': { label: 'SVG', extensions: ['.svg'], signature: (head) => /<svg[\s>]/i.test(head.toString('utf8')) },
  'application/pdf': { label: 'PDF', extensions: ['.pdf'], signature: (head) => starts(head, [0x25, 0x50, 0x44, 0x46]) },
  'application/msword': { label: 'Word', extensions: ['.doc'], signature: OLE },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'Word', extensions: ['.docx'], signature: ZIP },
  'application/vnd.ms-excel': { label: 'Excel', extensions: ['.xls'], signature: OLE },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { label: 'Excel', extensions: ['.xlsx'], signature: ZIP },
  'application/vnd.oasis.opendocument.text': { label: 'OpenDocument', extensions: ['.odt'], signature: ZIP },
  'application/vnd.oasis.opendocument.spreadsheet': { label: 'OpenDocument', extensions: ['.ods'], signature: ZIP },
};

export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;
export const FORMATS_TEXT = 'images (JPG, PNG, WebP, SVG), PDF, Word, Excel ou OpenDocument';

const extensionOf = (name: string) => {
  const match = /\.[a-z0-9]+$/i.exec(name.trim());
  return match ? match[0].toLowerCase() : '';
};

/** Problème du fichier, ou `null` s'il est accepté */
export function checkMedia(file: { name: string; mime: string; size: number; head: Buffer }): string | null {
  const format = MEDIA_FORMATS[file.mime];
  if (!format) return `Format non accepté : ${FORMATS_TEXT}.`;
  if (file.size > MAX_MEDIA_BYTES) return 'Fichier trop lourd : 20 Mo au maximum.';
  if (!format.extensions.includes(extensionOf(file.name))) return `L'extension du fichier ne correspond pas à son format (${format.label} attendu : ${format.extensions.join(', ')}).`;
  if (!format.signature(file.head)) return `Le contenu du fichier ne correspond pas à un fichier ${format.label}.`;
  return null;
}

/**
 * SVG nettoyé : profil SVG de DOMPurify (sans script, ni gestionnaire d'événement, ni
 * foreignObject), liens limités aux ancres internes. `null` si rien d'utilisable ne reste.
 */
export function sanitizeSvg(source: string): string | null {
  const clean = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'script', 'style'],
    FORBID_ATTR: ['style'],
  });
  // Liens externes (images, feuilles, polices) : seuls les renvois internes (#id) restent
  const withoutExternal = clean.replace(/\s(?:xlink:)?href\s*=\s*("[^"#][^"]*"|'[^'#][^']*')/gi, '');
  return /<svg[\s>]/i.test(withoutExternal) ? withoutExternal : null;
}
