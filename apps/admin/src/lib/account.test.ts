import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { changePassword, updateProfile } from './account';
import { sessionQuery, type SessionUser } from './session';

const sophie: SessionUser = {
  id: 1,
  documentId: 'u-sophie',
  email: 'sophie@mairie.fr',
  first_name: 'Sophie',
  last_name: 'Leroy',
  municipality_role: 'admin',
  site: null,
};

function respond(status: number, body: unknown) {
  const fetch = vi.fn(async (_path: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Mon compte', () => {
  it('nom : seuls le prénom et le nom partent, sans espaces autour ; la session est mise à jour', async () => {
    const fetch = respond(200, { data: { id: 1, email: sophie.email, first_name: 'Sophie-Anne', last_name: 'Martin', phone: null, municipality_role: 'admin' } });
    const client = new QueryClient();
    client.setQueryData(sessionQuery.queryKey, sophie);

    await updateProfile(client, { first_name: ' Sophie-Anne ', last_name: 'Martin ' });

    const [path, init] = fetch.mock.calls[0]!;
    expect(path).toBe('/api/user-management/me');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ data: { first_name: 'Sophie-Anne', last_name: 'Martin' } });
    expect(new Headers(init?.headers).get('X-Communeo-Csrf')).toBe('1');
    expect(client.getQueryData(sessionQuery.queryKey)).toEqual({ ...sophie, first_name: 'Sophie-Anne', last_name: 'Martin' });
  });

  it('mot de passe : la confirmation part avec, l’erreur du mot de passe actuel garde son champ', async () => {
    const fetch = respond(400, { error: { status: 400, message: 'Le mot de passe actuel est incorrect', details: { field: 'currentPassword' } } });
    const error = await changePassword('ancien', 'riviere et peupliers').catch((caught: unknown) => caught);
    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toEqual({
      currentPassword: 'ancien',
      password: 'riviere et peupliers',
      passwordConfirmation: 'riviere et peupliers',
    });
    expect(error).toMatchObject({ status: 400, message: 'Le mot de passe actuel est incorrect', details: { field: 'currentPassword' } });
  });
});
