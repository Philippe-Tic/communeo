/**
 * Étape 4 — Votre thème (#151, handoff 6.18) : les 4 thèmes en vignettes, avec le nom et le logo de
 * la commune déjà dedans ; « Aperçu » ouvre le vrai site de la commune dans le thème (aperçu plein
 * écran de l'écran Apparence). Les thèmes pas encore construits sont montrés, sans pouvoir être
 * choisis. Le choix est enregistré en continuant ; on peut en changer ensuite dans Mon site › Apparence.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { THEMES } from '@communeo/core';
import { ThemePreview, type Theme } from '@/components/appearance/appearance-screen';
import { Button } from '@/components/ui/button';
import type { SiteSettings } from '@/lib/site-settings';
import { cn } from '@/lib/utils';
import { WizardActions, type StepProps } from '../onboarding-screen';
import { WizardFrame } from '../wizard-frame';
import { StepHeading } from './step-heading';

/** Schéma de la page d'accueil de chaque thème, aux couleurs du thème, avec la commune dedans */
const LOOKS: Record<string, { bar: string; barText: string; hero: string; blocks: string; layout: 'three' | 'split' }> =
  {
    institutionnel: {
      bar: 'bg-[#1E3A5F]',
      barText: 'text-white',
      hero: 'bg-[#C9D6E6]',
      blocks: 'bg-[#E3EAF2]',
      layout: 'three',
    },
    moderne: {
      bar: 'bg-white',
      barText: 'text-[#1C1B18]',
      hero: 'bg-[#D5E6DC]',
      blocks: 'bg-[#EFE7DA]',
      layout: 'three',
    },
    journal: {
      bar: 'bg-[#1C1B18]',
      barText: 'text-white',
      hero: 'bg-[#DDD9CF]',
      blocks: 'bg-[#ECE9E1]',
      layout: 'split',
    },
    bourg: {
      bar: 'bg-[#F3EADB]',
      barText: 'text-[#5B4630]',
      hero: 'bg-[#E4D5BC]',
      blocks: 'bg-[#F1E8D8]',
      layout: 'three',
    },
  };

function Vignette({ theme, site }: { theme: Theme; site: SiteSettings }) {
  const look = LOOKS[theme.id] ?? LOOKS.institutionnel!;
  return (
    <div aria-hidden="true" className="flex aspect-[16/9] flex-col gap-1.5 rounded-t-[10px] bg-white p-2">
      <div className={cn('flex h-5 items-center gap-1.5 rounded px-1.5', look.bar, look.barText)}>
        {site.logo ? (
          <img src={site.logo.url} alt="" className="h-3.5 w-3.5 rounded-full bg-white object-contain" />
        ) : (
          <span className="size-2.5 rounded-full bg-current opacity-80" />
        )}
        <span className="truncate text-[9px] font-semibold">{site.name}</span>
      </div>
      {look.layout === 'split' ? (
        <div className="grid flex-1 grid-cols-[2fr_1fr] gap-1.5">
          <div className={cn('rounded', look.hero)} />
          <div className="grid gap-1.5">
            <div className={cn('rounded', look.blocks)} />
            <div className={cn('rounded', look.blocks)} />
          </div>
        </div>
      ) : (
        <>
          <div className={cn('flex-1 rounded', look.hero)} />
          <div className="grid h-1/4 grid-cols-3 gap-1.5">
            <div className={cn('rounded', look.blocks)} />
            <div className={cn('rounded', look.blocks)} />
            <div className={cn('rounded', look.blocks)} />
          </div>
        </>
      )}
    </div>
  );
}

export function ThemeStep({ site, step, next, back, later, alert }: StepProps & { alert: ReactNode }) {
  const client = useQueryClient();
  const current =
    THEMES.find((theme) => theme.id === site.theme && theme.available) ?? THEMES.find((theme) => theme.available)!;
  const [chosen, setChosen] = useState<Theme>(current);
  const [previewed, setPreviewed] = useState<Theme | null>(null);
  const [saving, setSaving] = useState(false);

  // Le thème n'est envoyé que s'il change (seul un thème construit peut être choisi)
  const payload = () => (chosen.id !== site.theme ? { theme: chosen.id } : undefined);
  const run = async (then: typeof next) => {
    setSaving(true);
    try {
      await then(payload());
      void client.invalidateQueries({ queryKey: ['preview'] });
    } finally {
      setSaving(false);
    }
  };

  return (
    <WizardFrame
      step={step}
      actions={
        <WizardActions
          onBack={back}
          tertiary={{ label: 'Enregistrer et continuer plus tard', onClick: () => void run(later) }}
          primary={{ label: `Continuer avec ${chosen.name}`, busy: saving, onClick: () => void run(next) }}
        />
      }
    >
      {alert}
      <StepHeading step={step}>Votre thème</StepHeading>
      <p className="mt-2 text-secondary">
        Voici {site.name} dans chacun des quatre thèmes. Vous pourrez changer d'avis à tout moment, vos contenus sont
        conservés.
      </p>
      <fieldset className="mt-5">
        <legend className="sr-only">Thème du site</legend>
        <ul className="grid gap-3 sm:grid-cols-2">
          {THEMES.map((theme) => {
            const selected = chosen.id === theme.id;
            return (
              <li
                key={theme.id}
                className={cn(
                  'flex flex-col rounded-xl bg-surface dark:bg-sidebar',
                  selected ? 'border-2 border-brand' : 'border border-border',
                )}
              >
                <Vignette theme={theme} site={site} />
                <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                  <label
                    className={cn(
                      'flex min-h-11 flex-1 items-center gap-2 font-semibold md:min-h-0',
                      theme.available ? 'cursor-pointer' : 'cursor-not-allowed',
                    )}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={theme.id}
                      checked={selected}
                      disabled={!theme.available}
                      onChange={() => setChosen(theme)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    {theme.name}
                    {!theme.available && (
                      <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[11px] font-semibold text-neutral">
                        Bientôt disponible
                      </span>
                    )}
                  </label>
                  {theme.available && (
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      aria-label={`Aperçu de votre site dans le thème ${theme.name}`}
                      onClick={() => setPreviewed(theme)}
                    >
                      Aperçu
                    </Button>
                  )}
                </div>
                <p className="px-3 pb-3 text-[13px] text-secondary">{theme.description}</p>
              </li>
            );
          })}
        </ul>
      </fieldset>
      {previewed && (
        <ThemePreview
          open
          onOpenChange={(open) => !open && setPreviewed(null)}
          theme={previewed}
          onThemeChange={setPreviewed}
          activeTheme={site.theme ?? ''}
          onChoose={() => {
            setChosen(previewed);
            setPreviewed(null);
          }}
        />
      )}
    </WizardFrame>
  );
}
