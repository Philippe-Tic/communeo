import { describe, expect, it } from 'vitest';
import { diffBlocks, summarizeChanges } from './versions';

const text = (value: string, id = 1) => ({ __component: 'blocks.text', id, body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] } });
const image = (file: number, id = 2) => ({ __component: 'blocks.image', id, image: { id: file, url: `/uploads/${file}.jpg`, alternativeText: 'x' }, width: 'normal' });
const documents = (id = 3) => ({ __component: 'blocks.documents', id, title: 'Tarifs', files: [{ id: 9, url: '/uploads/9.pdf', mime: 'application/pdf' }] });

describe('diffBlocks', () => {
  it('identiques malgré des identifiants techniques différents (fichier peuplé ou non)', () => {
    const before = [text('Bonjour', 10), image(4, 11)];
    const after = [text('Bonjour', 20), { __component: 'blocks.image', id: 21, image: 4, width: 'normal' }];
    expect(diffBlocks(before, after).map((change) => change.status)).toEqual(['same', 'same']);
  });

  it('ajout, suppression, modification alignés', () => {
    const before = [text('Tarifs 2025'), image(4), text('Contact')];
    const after = [text('Tarifs 2026'), text('Contact'), documents()];
    expect(diffBlocks(before, after).map((change) => [change.status, change.component])).toEqual([
      ['changed', 'blocks.text'],
      ['removed', 'blocks.image'],
      ['same', 'blocks.text'],
      ['added', 'blocks.documents'],
    ]);
  });

  it('déplacement : un retrait et un ajout du même bloc', () => {
    const changes = diffBlocks([text('A'), image(4)], [image(4), text('A')]);
    expect(changes.filter((change) => change.status !== 'same')).toHaveLength(2);
  });
});

describe('summarizeChanges', () => {
  it('première publication, puis ce qui a changé', () => {
    expect(summarizeChanges(null, { title: 'Salle', blocks: [] })).toBe('première publication');
    const before = { title: 'Salle des fêtes', blocks: [text('Tarifs')] };
    expect(summarizeChanges(before, { title: 'Salle des fêtes', blocks: [text('Tarifs'), documents()] })).toBe('ajout du bloc Documents');
    expect(summarizeChanges(before, { title: 'Location de la salle', blocks: [text('Tarifs 2026')] })).toBe(
      'titre modifié, modification du bloc Texte',
    );
    expect(summarizeChanges(before, { title: 'Salle des fêtes', blocks: [text('A'), image(4), documents()] })).toBe(
      '2 blocs ajoutés, 1 bloc modifié',
    );
  });

  it('autres champs, ou rien du tout', () => {
    const before = { title: 'Fête', blocks: [], location: 'Place' };
    expect(summarizeChanges(before, { ...before, location: 'Salle' })).toBe('informations modifiées');
    expect(summarizeChanges(before, { ...before })).toBe('republication sans changement');
  });
});
