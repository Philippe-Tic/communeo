import { describe, expect, it } from 'vitest';
import { signPreviewToken } from '@communeo/core';
import { resolvePreview, THEME_COOKIE, TOKEN_COOKIE } from './preview';

const env = { DATA_SOURCE: 'strapi', PREVIEW_SECRET: 'secret' } as NodeJS.ProcessEnv;
const now = new Date('2026-09-23T10:00:00Z');
const token = async (claims: { site: string; theme?: string } = { site: 'site-a' }, secret = 'secret') =>
  (await signPreviewToken(claims, secret, { now })).token;
const request = (path: string, cookies: Record<string, string> = {}, headers: Record<string, string> = {}) =>
  new Request(`http://preview.test${path}`, {
    headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; '), ...headers },
  });

describe('resolvePreview', () => {
  it('refuse une requête sans jeton', async () => {
    expect(await resolvePreview(request('/actualites'), env, now)).toEqual({ kind: 'deny' });
  });

  it("range un jeton valide en cookie et le retire de l'adresse", async () => {
    const decision = await resolvePreview(request(`/actualites/brocante?token=${await token()}&page=2`, {}, { 'x-forwarded-proto': 'https' }), env, now);
    expect(decision.kind).toBe('redirect');
    if (decision.kind !== 'redirect') return;
    expect(decision.location).toBe('/actualites/brocante?page=2');
    expect(decision.cookies[0]).toMatch(new RegExp(`^${TOKEN_COOKIE}=.+; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800; Secure$`));
    expect(decision.cookies[1]).toMatch(new RegExp(`^${THEME_COOKIE}=; .*Max-Age=0`));
  });

  it('refuse un jeton invalide, expiré ou signé avec un autre secret', async () => {
    expect(await resolvePreview(request('/?token=abc.def'), env, now)).toEqual({ kind: 'deny' });
    expect(await resolvePreview(request(`/?token=${await token(undefined, 'autre')}`), env, now)).toEqual({ kind: 'deny' });
    const later = new Date(now.getTime() + 31 * 60 * 1000);
    expect(await resolvePreview(request('/', { [TOKEN_COOKIE]: await token() }), env, later)).toEqual({ kind: 'deny' });
    expect(await resolvePreview(request('/', { [TOKEN_COOKIE]: await token() }), { ...env, PREVIEW_SECRET: '' }, now)).toEqual({ kind: 'deny' });
  });

  it('donne accès à la seule commune du jeton', async () => {
    const decision = await resolvePreview(request('/?site=site-b', { [TOKEN_COOKIE]: await token({ site: 'site-a' }) }), env, now);
    expect(decision).toEqual({ kind: 'allow', access: { siteDocumentId: 'site-a', theme: undefined } });
  });

  it('prend le thème du jeton, puis celui choisi avec ?theme=', async () => {
    const withTheme = await token({ site: 'site-a', theme: 'starter' });
    expect(await resolvePreview(request('/', { [TOKEN_COOKIE]: withTheme }), env, now)).toEqual({
      kind: 'allow',
      access: { siteDocumentId: 'site-a', theme: 'starter' },
    });

    const choose = await resolvePreview(request('/agenda?theme=moderne', { [TOKEN_COOKIE]: withTheme }), env, now);
    expect(choose).toMatchObject({ kind: 'redirect', location: '/agenda' });
    expect(await resolvePreview(request('/', { [TOKEN_COOKIE]: withTheme, [THEME_COOKIE]: 'moderne' }), env, now)).toEqual({
      kind: 'allow',
      access: { siteDocumentId: 'site-a', theme: 'moderne' },
    });
    expect(await resolvePreview(request('/?theme=inconnu', { [TOKEN_COOKIE]: withTheme }), env, now)).toEqual({ kind: 'deny' });
  });

  it('sert la commune de démonstration sans jeton', async () => {
    expect(await resolvePreview(request('/'), { DATA_SOURCE: 'fixtures' }, now)).toEqual({
      kind: 'allow',
      access: { siteDocumentId: 'demo', theme: undefined },
    });
  });
});
