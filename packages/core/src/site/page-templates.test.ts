import { describe, expect, it } from 'vitest';
import { validateBlocks } from '../blocks';
import { addPagesToMenu, NAVIGATION_LIMITS } from './navigation';
import { PAGE_TEMPLATES } from './page-templates';

const context = {
  communeName: 'Saint-Pierre-le-Moûtier',
  address: "33 place de l'Église, 58240 Saint-Pierre-le-Moûtier",
  phone: '03 86 90 19 94',
  email: 'mairie@saintpierrelemoutier.fr',
  hours: {
    days: {
      monday: [{ open: '09:00', close: '12:00' }],
      tuesday: [{ open: '09:00', close: '12:00' }],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
    closures: [],
  },
};

describe('modèles de pages', () => {
  it('cinq modèles, 4 proposés par défaut', () => {
    expect(PAGE_TEMPLATES.map((template) => template.id)).toEqual([
      'salle-des-fetes',
      'etat-civil',
      'urbanisme',
      'inscriptions-scolaires',
      'contact-services',
    ]);
    expect(PAGE_TEMPLATES.filter((template) => template.suggested)).toHaveLength(4);
  });

  it('chaque modèle est publiable tel quel (blocs complets), une fois les crochets remplacés', () => {
    for (const template of PAGE_TEMPLATES) {
      const result = validateBlocks(template.blocks(context), 'publish');
      expect(result.issues, template.id).toEqual([]);
    }
  });

  it('contacter les services : les coordonnées de la mairie dans le bloc Contact', () => {
    const contact = PAGE_TEMPLATES.find((template) => template.id === 'contact-services')!.blocks(context)[1]!;
    expect(contact).toMatchObject({
      name: 'Mairie de Saint-Pierre-le-Moûtier',
      phone: '03 86 90 19 94',
      hours: 'Lun–Mar : 9h–12h',
    });
  });
});


describe('pages ajoutées au menu', () => {
  it('dans « Vie pratique », créé s’il reste une place ; pas de doublon', () => {
    const { config, left } = addPagesToMenu({ main: [{ type: 'section', section: 'actualites' }] }, ['p1', 'p2']);
    expect(config.main[1]).toEqual({
      type: 'group',
      label: 'Vie pratique',
      children: [
        { type: 'page', pageDocumentId: 'p1' },
        { type: 'page', pageDocumentId: 'p2' },
      ],
    });
    expect(left).toEqual([]);
    expect(addPagesToMenu(config, ['p2', 'p3']).config.main[1]).toMatchObject({ children: [{}, {}, { pageDocumentId: 'p3' }] });
  });

  it('menu plein : rien d’ajouté, pages signalées', () => {
    const full = { main: Array.from({ length: NAVIGATION_LIMITS.main }, () => ({ type: 'section' as const, section: 'agenda' as const })) };
    expect(addPagesToMenu(full, ['p1']).left).toEqual(['p1']);
  });
});
