import { describe, expect, it } from 'vitest';
import { onboardingChecklist, type ChecklistInput } from './onboarding-checklist';

const declaration = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Déclaration' }] }] };

const complete: ChecklistInput = {
  site: {
    address: "33 place de l'Église",
    contact_phone: '03 86 90 19 94',
    contact_mail: 'mairie@example.fr',
    hasLogo: true,
    mentions_legales: { siret: '21580238100019', publication_director: 'Marie Durand' },
    rgpd: { dpo_name: 'Centre de gestion', dpo_email: 'dpo@example.fr' },
    accessibilite: { accessibility_declaration: declaration },
    custom_domain: 'www.mairie.fr',
    domain_status: 'verified',
  },
  pages: { published: 5, templateDrafts: 0 },
};

describe('checklist « Pour terminer votre site »', () => {
  it('site complet : sept points faits, rien à faire', () => {
    const checklist = onboardingChecklist(complete);
    expect(checklist).toMatchObject({ done: 7, total: 7, todo: [] });
  });

  it('au sortir de l’assistant : mentions légales, pages en brouillon et domaine à faire, dans cet ordre', () => {
    const checklist = onboardingChecklist({
      site: {
        ...complete.site,
        mentions_legales: { siret: '', publication_director: null },
        custom_domain: null,
        domain_status: null,
      },
      pages: { published: 0, templateDrafts: 4 },
    });
    expect(checklist.done).toBe(4);
    expect(checklist.todo.map((item) => item.todo)).toEqual([
      'Compléter les mentions légales (SIRET, directeur de publication)',
      'Relire et publier les 4 pages en brouillon',
      'Ajouter votre nom de domaine',
    ]);
    expect(checklist.todo[1]!.target).toEqual({ to: '/pages', search: { statut: 'brouillon' } });
  });

  it('précise ce qui manque, et le domaine en attente de vérification', () => {
    const checklist = onboardingChecklist({
      site: { ...complete.site, contact_mail: ' ', hasLogo: false, domain_status: 'pending', accessibilite: null },
      pages: { published: 2, templateDrafts: 1 },
    });
    const todo = Object.fromEntries(checklist.todo.map((item) => [item.id, item.todo]));
    expect(todo).toEqual({
      accessibilite: "Rédiger la déclaration d'accessibilité",
      pages: 'Relire et publier la page en brouillon',
      informations: 'Compléter les coordonnées de la mairie (e-mail)',
      logo: 'Ajouter le logo de la commune',
      domaine: 'Terminer la configuration de www.mairie.fr',
    });
  });

  it('sans page publiée, même sans modèle : publier une première page', () => {
    const checklist = onboardingChecklist({ ...complete, pages: { published: 0, templateDrafts: 0 } });
    expect(checklist.todo.map((item) => item.todo)).toEqual(['Publier une première page']);
  });

  it('pendant l’essai, le domaine vient avec le passage en live', () => {
    const checklist = onboardingChecklist({ ...complete, site: { ...complete.site, custom_domain: null, plan: 'trial' } });
    expect(checklist.todo.map((item) => [item.todo, item.target])).toEqual([
      ["Passer en live pour relier le site à l'adresse de la commune", { to: '/passer-en-live', adminOnly: true }],
    ]);
  });
});
