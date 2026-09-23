import { describe, expect, it } from 'vitest';
import { signPreviewToken, verifyPreviewToken } from './token';

const secret = 'secret-de-test';
const now = new Date('2026-09-23T10:00:00Z');

describe('jetons de preview', () => {
  it('vérifie un jeton signé et en restitue les claims', async () => {
    const { token, expiresAt } = await signPreviewToken({ site: 'site-a', theme: 'starter' }, secret, { now });
    expect(expiresAt.toISOString()).toBe('2026-09-23T10:30:00.000Z');
    expect(await verifyPreviewToken(token, secret, now)).toEqual({ site: 'site-a', theme: 'starter', exp: expiresAt.getTime() / 1000 });
  });

  it('refuse un jeton expiré', async () => {
    const { token } = await signPreviewToken({ site: 'site-a' }, secret, { now, ttlSeconds: 60 });
    expect(await verifyPreviewToken(token, secret, new Date('2026-09-23T10:01:00Z'))).toBeNull();
  });

  it('refuse un jeton signé avec un autre secret', async () => {
    const { token } = await signPreviewToken({ site: 'site-a' }, 'autre-secret', { now });
    expect(await verifyPreviewToken(token, secret, now)).toBeNull();
  });

  it("refuse un jeton dont on a changé la commune", async () => {
    const { token } = await signPreviewToken({ site: 'site-a' }, secret, { now });
    const [, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ site: 'site-b', exp: 9_999_999_999 })).toString('base64url');
    expect(await verifyPreviewToken(`${forged}.${signature}`, secret, now)).toBeNull();
  });

  it('refuse les jetons mal formés et un secret vide', async () => {
    for (const bad of [undefined, null, '', 'abc', 'a.b.c', '!!!.???', 'e30.e30']) {
      expect(await verifyPreviewToken(bad, secret, now)).toBeNull();
    }
    const { token } = await signPreviewToken({ site: 'site-a' }, secret, { now });
    expect(await verifyPreviewToken(token, '', now)).toBeNull();
    await expect(signPreviewToken({ site: 'site-a' }, '')).rejects.toThrow();
  });
});
