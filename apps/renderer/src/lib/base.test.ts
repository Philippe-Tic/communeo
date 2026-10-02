import { describe, expect, it } from 'vitest';
import { BASE, rebaseHtml, withBase } from './base';

describe('withBase', () => {
  it('sans sous-dossier (sites des communes) : rien ne change', () => {
    expect(BASE).toBe('');
    expect(withBase('/actualites')).toBe('/actualites');
    expect(rebaseHtml('<a href="/contact">Contact</a>')).toBe('<a href="/contact">Contact</a>');
  });

  it('préfixe les adresses depuis la racine, pas les autres', () => {
    const base = '/demo/journal';
    expect(withBase('/', base)).toBe('/demo/journal/');
    expect(withBase('/actualites/brocante?x=1#a', base)).toBe('/demo/journal/actualites/brocante?x=1#a');
    expect(withBase('/demo/journal/_astro/a.css', base)).toBe('/demo/journal/_astro/a.css');
    expect(withBase('/demo/journal', base)).toBe('/demo/journal');
    expect(withBase('https://communeo.fr/', base)).toBe('https://communeo.fr/');
    expect(withBase('//cdn.example/a.js', base)).toBe('//cdn.example/a.js');
    expect(withBase('#contenu', base)).toBe('#contenu');
    expect(withBase('../moderne/contact', base)).toBe('../moderne/contact');
  });
});

describe('rebaseHtml', () => {
  it('réécrit liens, images, formulaires, points d’accès des scripts et srcset', () => {
    const html = [
      '<a href="/">Accueil</a>',
      '<a href="/agenda" class="x">Agenda</a>',
      '<img src="/fixtures/marche.svg" srcset="/fixtures/a.jpg 640w, /fixtures/b.jpg 1280w" alt="">',
      '<form role="search" action="/recherche">',
      '<div data-endpoint="/fixtures/demarche.json">',
      '<link rel="stylesheet" href="/demo/journal/_astro/styles.css">',
      '<a href="https://communeo.fr/">Communeo</a>',
      '<a href="#contenu">Aller au contenu</a>',
      '<p>Le chemin /contact dans un texte</p>',
    ].join('');
    expect(rebaseHtml(html, '/demo/journal')).toBe(
      [
        '<a href="/demo/journal/">Accueil</a>',
        '<a href="/demo/journal/agenda" class="x">Agenda</a>',
        '<img src="/demo/journal/fixtures/marche.svg" srcset="/demo/journal/fixtures/a.jpg 640w, /demo/journal/fixtures/b.jpg 1280w" alt="">',
        '<form role="search" action="/demo/journal/recherche">',
        '<div data-endpoint="/demo/journal/fixtures/demarche.json">',
        '<link rel="stylesheet" href="/demo/journal/_astro/styles.css">',
        '<a href="https://communeo.fr/">Communeo</a>',
        '<a href="#contenu">Aller au contenu</a>',
        '<p>Le chemin /contact dans un texte</p>',
      ].join(''),
    );
  });
});
