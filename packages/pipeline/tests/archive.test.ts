import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createZipWriter } from '../src';

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const entries = (file: string) => execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).trim().split('\n').sort();
const read = (file: string, name: string) => execFileSync('unzip', ['-p', file, name], { encoding: 'utf8' });

describe('createZipWriter', () => {
  it('écrit textes, fichiers et dossiers (sauf ceux écartés) dans un ZIP sur le disque', async () => {
    const site = path.join(dir, 'site');
    fs.mkdirSync(path.join(site, '.regles'), { recursive: true });
    fs.mkdirSync(path.join(site, 'actualites'));
    fs.writeFileSync(path.join(site, 'index.html'), '<h1>Accueil</h1>');
    fs.writeFileSync(path.join(site, 'actualites', 'index.html'), '<h1>Actualités</h1>');
    fs.writeFileSync(path.join(site, '.regles', 'site.caddy'), 'règles');
    fs.writeFileSync(path.join(dir, 'photo.jpg'), 'jpeg');

    const file = path.join(dir, 'export.zip');
    const zip = createZipWriter(file);
    zip.addText('LISEZMOI.md', '# Données');
    zip.addFile('fichiers/1-photo.jpg', path.join(dir, 'photo.jpg'));
    zip.addDirectory(site, 'site-publie', (name) => name.startsWith('.regles'));
    const size = await zip.finalize();

    expect(size).toBe(fs.statSync(file).size);
    expect(entries(file)).toEqual(['LISEZMOI.md', 'fichiers/1-photo.jpg', 'site-publie/actualites/', 'site-publie/actualites/index.html', 'site-publie/index.html']);
    expect(read(file, 'LISEZMOI.md')).toBe('# Données');
    expect(read(file, 'site-publie/actualites/index.html')).toBe('<h1>Actualités</h1>');
  });

  it('échoue quand un fichier a disparu, plutôt que de donner une archive incomplète', async () => {
    const zip = createZipWriter(path.join(dir, 'export.zip'));
    zip.addFile('fichiers/absent.pdf', path.join(dir, 'absent.pdf'));
    await expect(zip.finalize()).rejects.toThrow();
  });
});
