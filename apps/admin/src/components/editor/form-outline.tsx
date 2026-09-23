/**
 * Sommaire collant du formulaire en sections (handoff 6.4) : liens vers les sections, section courante
 * en vert (suit le défilement), point rouge sur les sections qui ont des erreurs.
 */
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { flattenErrors } from '@/components/form';
import { cn } from '@/lib/utils';

export interface OutlineSection {
  /** id de la section (ancre) */
  id: string;
  title: string;
  /** Champs de la section, pour signaler ses erreurs */
  fields: string[];
}

export function FormOutline({ sections }: { sections: OutlineSection[] }) {
  const { formState } = useFormContext();
  const errors = flattenErrors(formState.errors);
  const [current, setCurrent] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrent(visible.target.getAttribute('data-section') ?? visible.target.id);
      },
      { rootMargin: '-130px 0px -55% 0px' },
    );
    for (const section of sections) {
      // La carte entière (FormSection porte data-section), à défaut l'ancre
      const element = document.querySelector(`[data-section="${section.id}"]`) ?? document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sommaire du formulaire" className="sticky top-[140px] hidden w-[200px] shrink-0 min-[1200px]:block">
      <ul className="border-l-2 border-border">
        {sections.map((section) => {
          const invalid = errors.some((error) => section.fields.some((field) => error.name === field || error.name.startsWith(`${field}.`)));
          const active = section.id === current;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn('-ml-0.5 flex items-center gap-2 border-l-2 py-2 pl-3.5 text-[13px]', active ? 'border-brand font-semibold text-brand' : 'border-transparent text-secondary hover:text-text')}
              >
                {section.title}
                {invalid && (
                  <>
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-danger" />
                    <span className="sr-only">(erreurs)</span>
                  </>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
