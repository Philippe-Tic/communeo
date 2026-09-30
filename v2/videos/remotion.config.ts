/**
 * Rendu des vidéos de communeo.fr : 1920 × 1080, 30 images/s (réglés par composition), H.264.
 * Les réglages de qualité (CRF) sont choisis par scripts/render.ts pour rester sous 20 Mo.
 */
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
