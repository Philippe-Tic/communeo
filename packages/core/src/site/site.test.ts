import { describe, expect, it } from 'vitest';
import { siteThemeValues } from '../generated/strapi';
import { THEME_IDS, validateHomepage } from './index';

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

describe('thèmes', () => {
  it("le registre correspond exactement à l'énumération theme du Site", () => {
    expect([...siteThemeValues].sort()).toEqual([...THEME_IDS].sort());
  });
});

describe("page d'accueil", () => {
  it('accepte un accueil complet', () => {
    const homepage = {
      hero: { enabled: true, title: 'Bienvenue', primary_url: '/demarches' },
      quick_links: { enabled: true, items: [{ label: 'État civil', url: '/etat-civil', icon: 'identity' }] },
      featured_news: { enabled: true, count: 3 },
      mayor_word: { enabled: true, body: doc(p('Chers habitants')) },
      free_content: { enabled: true, body: doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'La commune' }] }) },
      weather: { enabled: false },
    };
    expect(validateHomepage(homepage).success).toBe(true);
  });

  it('refuse un titre dans le mot du maire et un H1 dans le contenu libre', () => {
    const h = (level: number) => doc({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'x' }] });
    expect(validateHomepage({ mayor_word: { body: h(2) } }).success).toBe(false);
    expect(validateHomepage({ free_content: { body: h(1) } }).success).toBe(false);
  });

  it('refuse plus de 8 accès rapides et plus de 6 actualités', () => {
    const items = Array.from({ length: 9 }, () => ({ label: 'x', url: '/x' }));
    expect(validateHomepage({ quick_links: { items } }).success).toBe(false);
    expect(validateHomepage({ featured_news: { count: 7 } }).success).toBe(false);
  });

  it('refuse un lien javascript: dans les boutons et accès rapides', () => {
    expect(validateHomepage({ hero: { primary_url: 'javascript:alert(1)' } }).success).toBe(false);
    expect(validateHomepage({ quick_links: { items: [{ url: 'javascript:alert(1)' }] } }).success).toBe(false);
  });
});
