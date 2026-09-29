import { describe, expect, it } from 'vitest';
import { signupApproval } from './signup';

describe('signupApproval', () => {
  it('adresse officielle elle-même : rien à approuver (casse et espaces ignorés)', () => {
    expect(signupApproval(' Mairie@Saint-Aubin.fr ', 'mairie@saint-aubin.fr')).toBe('same_email');
    expect(signupApproval('mairie.saint-aubin@orange.fr', 'mairie.saint-aubin@orange.fr')).toBe('same_email');
  });

  it('même domaine que la mairie : rien à approuver', () => {
    expect(signupApproval('secretariat@saint-aubin.fr', 'mairie@saint-aubin.fr')).toBe('same_domain');
  });

  it('même messagerie grand public : la mairie approuve', () => {
    expect(signupApproval('jean.dupont@orange.fr', 'mairie.saint-aubin@orange.fr')).toBe('townhall');
    expect(signupApproval('julie@gmail.com', 'mairie.x@gmail.com')).toBe('townhall');
  });

  it('autre domaine : la mairie approuve ; sous-domaine : pas le même domaine', () => {
    expect(signupApproval('julie@gmail.com', 'mairie@saint-aubin.fr')).toBe('townhall');
    expect(signupApproval('julie@mail.saint-aubin.fr', 'mairie@saint-aubin.fr')).toBe('townhall');
  });

  it("sans adresse officielle connue : l'équipe vérifie", () => {
    expect(signupApproval('julie@saint-aubin.fr', null)).toBe('team');
    expect(signupApproval('julie@saint-aubin.fr', ' ')).toBe('team');
  });
});
