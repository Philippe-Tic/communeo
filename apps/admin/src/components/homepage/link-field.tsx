/**
 * Cible d'un lien de l'accueil (boutons de l'accroche, accès rapides) : une page du site, une
 * rubrique, ou une autre adresse. La valeur enregistrée est l'adresse (`/salle-des-fetes`,
 * `/demarches`, `https://…`) : le site la reprend telle quelle.
 */
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { SECTIONS } from '@communeo/core';
import { controlClass, fieldId, FieldError, useFieldError } from '@/components/form';
import { allPagesQuery } from '@/lib/site-settings';
import { cn } from '@/lib/utils';

const SECTION_OPTIONS = Object.entries(SECTIONS).map(([key, section]) => ({ key, ...section }));
const EXTERNAL = '__autre';

/** Libellé court de la cible : « Page : Salle des fêtes », « Rubrique : Démarches », l'adresse sinon */
export function describeTarget(url: string, pages: Array<{ title: string; slug: string }> = []) {
  const page = pages.find((entry) => `/${entry.slug}` === url);
  if (page) return `Page : ${page.title}`;
  const section = SECTION_OPTIONS.find((entry) => entry.path === url);
  if (section) return `Rubrique : ${section.label}`;
  return url;
}

export function LinkField({ name, label, compact }: { name: string; label: string; compact?: boolean }) {
  const { control } = useFormContext();
  const pages = useQuery(allPagesQuery);
  const error = useFieldError(name);
  const id = fieldId(name);
  // « Autre adresse » choisie : le champ d'adresse reste affiché même vide
  const [external, setExternal] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, ref } }) => {
        const url = typeof value === 'string' ? value : '';
        const pageMatch = pages.data?.find((page) => `/${page.slug}` === url);
        const sectionMatch = SECTION_OPTIONS.find((section) => section.path === url);
        const choice = pageMatch
          ? `page:${pageMatch.documentId}`
          : sectionMatch
            ? `section:${sectionMatch.key}`
            : url || external
              ? EXTERNAL
              : '';
        const describedBy = error ? `${id}-erreur` : undefined;
        // Le lien du récapitulatif d'erreurs mène au champ d'adresse s'il est affiché, sinon à la liste
        const selectId = choice === EXTERNAL ? `${id}-cible` : id;
        return (
          <div className="min-w-0" data-field={name}>
            <div className="relative">
              <label htmlFor={selectId} className={compact ? 'sr-only' : 'mb-1.5 block font-medium'}>
                {label}
              </label>
              <select
                id={selectId}
                value={choice}
                aria-describedby={choice === EXTERNAL ? undefined : describedBy}
                aria-invalid={error && choice !== EXTERNAL ? true : undefined}
                onChange={(event) => {
                  const next = event.target.value;
                  setExternal(next === EXTERNAL);
                  if (next === EXTERNAL) onChange(sectionMatch || pageMatch ? '' : url);
                  else if (next.startsWith('page:'))
                    onChange(`/${pages.data!.find((page) => `page:${page.documentId}` === next)!.slug}`);
                  else if (next.startsWith('section:'))
                    onChange(SECTION_OPTIONS.find((section) => `section:${section.key}` === next)!.path);
                  else onChange('');
                }}
                className={cn(controlClass, 'h-11 appearance-none pr-8 md:h-10')}
              >
                <option value="">Choisir…</option>
                <optgroup label="Rubriques">
                  {SECTION_OPTIONS.map((section) => (
                    <option key={section.key} value={`section:${section.key}`}>
                      {section.label}
                    </option>
                  ))}
                </optgroup>
                {!!pages.data?.length && (
                  <optgroup label="Pages">
                    {pages.data.map((page) => (
                      <option key={page.documentId} value={`page:${page.documentId}`}>
                        {page.title}
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value={EXTERNAL}>Autre adresse…</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute right-2.5 size-4 text-secondary',
                  compact ? 'top-1/2 -translate-y-1/2' : 'bottom-3 md:bottom-2.5',
                )}
              />
            </div>
            {choice === EXTERNAL && (
              <div className="mt-2">
                <label htmlFor={id} className="sr-only">
                  {`${label} : adresse`}
                </label>
                <input
                  ref={ref}
                  id={id}
                  value={url}
                  placeholder="https://"
                  autoComplete="off"
                  aria-describedby={describedBy}
                  aria-invalid={error ? true : undefined}
                  onChange={(event) => onChange(event.target.value)}
                  className={cn(controlClass, 'h-11 md:h-10')}
                />
              </div>
            )}
            <FieldError id={id} message={error} />
          </div>
        );
      }}
    />
  );
}
