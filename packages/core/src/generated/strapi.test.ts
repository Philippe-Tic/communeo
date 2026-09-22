import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { articleStatusValues, pluralNames } from './strapi';

const source = readFileSync(new URL('./strapi.ts', import.meta.url), 'utf8');
const body = (name: string) => source.match(new RegExp(`export interface ${name} extends [^{]+\\{([^}]*)\\}`))?.[1] ?? '';

describe('types Strapi générés', () => {
  it("n'expose jamais les champs privés", () => {
    expect(body('User')).not.toMatch(/password|resetPasswordToken|confirmationToken/);
    expect(body('Site')).not.toMatch(/netlify_site_id|domain_verification_token/);
  });

  it('expose les énumérations comme valeurs réutilisables', () => {
    expect(articleStatusValues).toContain('published');
  });

  it('associe chaque content-type à sa route REST', () => {
    expect(pluralNames['api::article.article']).toBe('articles');
  });
});
