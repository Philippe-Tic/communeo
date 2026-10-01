#!/usr/bin/env node
/**
 * Icônes de communeo.fr depuis le pictogramme (src/assets/picto-communeo.svg) :
 * - public/apple-touch-icon.png : 180 × 180, pictogramme sapin sur fond papier (écran d'accueil iOS,
 *   logo des données structurées) ;
 * - public/favicon.ico : 32 × 32, pour les navigateurs et lecteurs qui ne lisent pas favicon.svg.
 *
 *   pnpm --filter @communeo/site icones
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ici = (chemin) => fileURLToPath(new URL(chemin, import.meta.url));
// Le pictogramme suit la couleur du texte (currentColor) : vert sapin pour les icônes
const picto = Buffer.from(readFileSync(ici('../src/assets/picto-communeo.svg'), 'utf8').replaceAll('currentColor', '#0E4033'));

// Écran d'accueil : fond papier plein (iOS arrondit les angles), pictogramme à 62 % de la largeur
const cote = 180;
const taillePicto = Math.round(cote * 0.62);
const pictoPng = await sharp(picto, { density: 600 }).resize(taillePicto, taillePicto).png().toBuffer();
await sharp({ create: { width: cote, height: cote, channels: 4, background: '#EFECE5' } })
  .composite([{ input: pictoPng, gravity: 'centre' }])
  .png()
  .toFile(ici('../public/apple-touch-icon.png'));

// favicon.ico : une image PNG 32 × 32 dans un conteneur ICO (format accepté par tous les navigateurs)
const png32 = await sharp(picto, { density: 600 }).resize(32, 32).png().toBuffer();
const entete = Buffer.alloc(6 + 16);
entete.writeUInt16LE(0, 0); // réservé
entete.writeUInt16LE(1, 2); // type : icône
entete.writeUInt16LE(1, 4); // une image
entete.writeUInt8(32, 6); // largeur
entete.writeUInt8(32, 7); // hauteur
entete.writeUInt8(0, 8); // palette
entete.writeUInt8(0, 9); // réservé
entete.writeUInt16LE(1, 10); // plans
entete.writeUInt16LE(32, 12); // bits par pixel
entete.writeUInt32LE(png32.length, 14); // taille de l'image
entete.writeUInt32LE(22, 18); // position de l'image
writeFileSync(ici('../public/favicon.ico'), Buffer.concat([entete, png32]));
console.log('✓ public/apple-touch-icon.png, public/favicon.ico');
