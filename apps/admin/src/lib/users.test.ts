import { describe, expect, it } from 'vitest';
import { fullName, roleLabel, stateOf, type CommuneUser } from './users';

const user = (fields: Partial<CommuneUser>): CommuneUser =>
  ({
    id: 1,
    email: 'sophie@mairie.fr',
    first_name: 'Sophie',
    last_name: 'Leroy',
    municipality_role: 'admin',
    blocked: false,
    active: true,
    createdAt: '',
    ...fields,
  }) as CommuneUser;

describe('utilisateurs', () => {
  it('état : actif, invitation en attente, désactivé (la désactivation prime)', () => {
    expect(stateOf(user({}))).toBe('active');
    expect(stateOf(user({ blocked: true }))).toBe('invited');
    expect(stateOf(user({ active: false, blocked: true }))).toBe('disabled');
    expect(stateOf(user({ active: null }))).toBe('active');
  });
  it('nom affiché : prénom et nom, sinon l’e-mail', () => {
    expect(fullName(user({}))).toBe('Sophie Leroy');
    expect(fullName(user({ first_name: null, last_name: null }))).toBe('sophie@mairie.fr');
  });
  it('rôles', () => {
    expect(roleLabel('admin')).toBe('Administrateur');
    expect(roleLabel('editor')).toBe('Éditeur');
    expect(roleLabel('super_admin')).toBe('Équipe Communeo');
  });
});
