import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getPublisher, LocalPublisher } from '../src';

let root: string;
let build: string;
const site = { documentId: 'doc-1', slug: 'lyon', name: 'Lyon' };

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'local-publisher-'));
  build = fs.mkdtempSync(path.join(os.tmpdir(), 'local-build-'));
  fs.mkdirSync(path.join(build, 'actualites'));
  fs.writeFileSync(path.join(build, 'index.html'), '<h1>v2</h1>');
  fs.writeFileSync(path.join(build, 'actualites', 'index.html'), '<h1>Actualités</h1>');
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(build, { recursive: true, force: true });
});

describe('LocalPublisher', () => {
  it('remplace le site publié par le nouveau build', async () => {
    fs.mkdirSync(path.join(root, 'lyon'));
    fs.writeFileSync(path.join(root, 'lyon', 'ancienne-page.html'), 'v1');

    const publisher = new LocalPublisher({ root, baseUrl: 'http://localhost:8080/' });
    expect(await publisher.publish(site, build)).toMatchObject({ hostId: 'lyon', defaultUrl: 'http://localhost:8080/lyon', state: 'ready' });
    expect(fs.readdirSync(path.join(root, 'lyon')).sort()).toEqual(['actualites', 'index.html']);
    expect(fs.readdirSync(root)).toEqual(['lyon']);
  });

  it('donne par défaut une adresse http, utilisable comme adresse canonique', async () => {
    expect((await new LocalPublisher({ root }).ensureSite(site)).defaultUrl).toBe('http://localhost:8080/lyon');
  });

  it('refuse un slug qui sortirait du dossier', async () => {
    await expect(new LocalPublisher({ root }).publish({ ...site, slug: '../x' }, build)).rejects.toThrow('Slug invalide');
  });

  it('est choisi par getPublisher quand PUBLISH_DIR est défini sans jeton Netlify', () => {
    expect(getPublisher({ PUBLISH_DIR: root }).id).toBe('local');
    expect(getPublisher({ PUBLISH_DIR: root, NETLIFY_TOKEN: 't' }).id).toBe('netlify');
  });
});
