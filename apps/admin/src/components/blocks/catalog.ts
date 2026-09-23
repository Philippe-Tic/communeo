/**
 * Catalogue des 9 blocs (handoff 6.3) : libellé, description, icône, valeur d'un bloc neuf et résumé
 * affiché sur la carte repliée. Les types et la validation viennent de @communeo/core.
 */
import { BLOCK_UIDS, type BlockUid, type RichTextDocument } from '@communeo/core';
import { FileDown, Images, Image as ImageIcon, Info, MapPin, MessageCircleQuestion, MousePointerClick, Type, Video, type LucideIcon } from 'lucide-react';

/** Bloc tel qu'il circule entre l'API (zone dynamique Strapi) et le formulaire */
export type Block = { __component: BlockUid; id?: number } & Record<string, unknown>;

export interface BlockType {
  uid: BlockUid;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Faux tant que la médiathèque n'est pas là (#142) : le bloc existe mais ne se crée pas encore */
  available: boolean;
  create: () => Block;
  summary: (block: Block) => string;
}

export const emptyDoc = (): RichTextDocument => ({ type: 'doc', content: [{ type: 'paragraph' }] });

/** Texte brut d'un document riche (résumés, compteurs) */
export function plainText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && n.text) parts.push(n.text);
    if (Array.isArray(n.content)) {
      n.content.forEach(walk);
      if (n.type === 'paragraph' || n.type === 'heading') parts.push(' ');
    }
  };
  walk(doc);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

const count = (value: unknown) => (Array.isArray(value) ? value.length : 0);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
const str = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export const CALLOUT_LABELS = { info: 'Information', warning: 'Attention', important: 'Important', tip: 'Conseil' } as const;

export const BLOCK_TYPES: BlockType[] = [
  {
    uid: 'blocks.text',
    label: 'Texte',
    description: 'Paragraphes, intertitres, listes et liens.',
    icon: Type,
    available: true,
    create: () => ({ __component: 'blocks.text', body: emptyDoc() }),
    summary: (block) => plainText(block.body) || 'Texte vide',
  },
  {
    uid: 'blocks.image',
    label: 'Image',
    description: 'Une photo ou une illustration, avec son texte alternatif.',
    icon: ImageIcon,
    available: true,
    create: () => ({ __component: 'blocks.image', image: null, caption: '', width: 'normal' }),
    summary: (block) => str(block.caption) || str((block.image as { alternativeText?: string } | null)?.alternativeText) || 'Image',
  },
  {
    uid: 'blocks.buttons',
    label: 'Bouton ou lien',
    description: "Un à trois boutons vers une page, un site ou un fichier.",
    icon: MousePointerClick,
    available: true,
    create: () => ({ __component: 'blocks.buttons', buttons: [{ label: '', url: '', style: 'primary' }] }),
    summary: (block) =>
      (Array.isArray(block.buttons) ? block.buttons : []).map((button) => str((button as { label?: unknown }).label)).filter(Boolean).join(' · ') || 'Aucun bouton',
  },
  {
    uid: 'blocks.callout',
    label: 'Encadré',
    description: 'Une information à mettre en avant : attention, conseil…',
    icon: Info,
    available: true,
    create: () => ({ __component: 'blocks.callout', variant: 'info', title: '', body: emptyDoc() }),
    summary: (block) =>
      [CALLOUT_LABELS[block.variant as keyof typeof CALLOUT_LABELS], str(block.title) || plainText(block.body)].filter(Boolean).join(' — ') || 'Encadré',
  },
  {
    uid: 'blocks.documents',
    label: 'Documents',
    description: 'Fichiers à télécharger : PDF, formulaires, comptes rendus.',
    icon: FileDown,
    available: true,
    create: () => ({ __component: 'blocks.documents', title: '', files: [] }),
    summary: (block) => plural(count(block.files), 'document', 'documents'),
  },
  {
    uid: 'blocks.gallery',
    label: 'Galerie',
    description: 'De 3 à 12 photos présentées ensemble.',
    icon: Images,
    available: true,
    create: () => ({ __component: 'blocks.gallery', title: '', images: [] }),
    summary: (block) => plural(count(block.images), 'image', 'images'),
  },
  {
    uid: 'blocks.faq',
    label: 'Questions / réponses',
    description: 'Des questions fréquentes, dépliables une à une.',
    icon: MessageCircleQuestion,
    available: true,
    create: () => ({ __component: 'blocks.faq', title: '', items: [{ question: '', answer: emptyDoc() }] }),
    summary: (block) => [str(block.title), plural(count(block.items), 'question', 'questions')].filter(Boolean).join(' — '),
  },
  {
    uid: 'blocks.contact',
    label: 'Contact / lieu',
    description: 'Un service ou un lieu : adresse, téléphone, horaires, carte.',
    icon: MapPin,
    available: true,
    create: () => ({ __component: 'blocks.contact', name: '', address: '', phone: '', email: '', hours: '', show_map: false }),
    summary: (block) => str(block.name) || 'Contact',
  },
  {
    uid: 'blocks.video',
    label: 'Vidéo',
    description: 'Une vidéo YouTube, Dailymotion ou Vimeo, chargée après consentement.',
    icon: Video,
    available: true,
    create: () => ({ __component: 'blocks.video', url: '', title: '', transcript: '' }),
    summary: (block) => str(block.title) || 'Vidéo',
  },
];

const BY_UID = new Map(BLOCK_TYPES.map((type) => [type.uid, type]));

export function blockType(uid: string): BlockType | undefined {
  return BY_UID.get(uid as BlockUid);
}

// Le catalogue de l'admin couvre tout le catalogue de core
if (BLOCK_TYPES.length !== BLOCK_UIDS.length) throw new Error('Catalogue de blocs incomplet');
