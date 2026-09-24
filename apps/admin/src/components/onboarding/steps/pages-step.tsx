/**
 * Étape 6 — Premières pages (#153, handoff 6.18) : cinq modèles à cocher (quatre proposés), créés
 * en brouillon avec des textes à adapter et ajoutés au menu du site (sous-menu « Vie pratique »,
 * visibles une fois publiés). Un modèle déjà utilisé est signalé et n'est pas recréé.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { createFromTemplates, pageTemplatesQuery } from '@/lib/page-templates';
import { cn } from '@/lib/utils';
import { WizardActions, type StepProps } from '../onboarding-screen';
import { WizardFrame } from '../wizard-frame';
import { StepHeading } from './step-heading';

export function PagesStep({ step, next, back, alert }: StepProps & { alert: ReactNode }) {
  const client = useQueryClient();
  const templates = useQuery(pageTemplatesQuery);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = (templates.data ?? []).filter((template) => !template.page);
  // Cochés par défaut : les modèles proposés, pas encore utilisés
  const selected = chosen ?? new Set(available.filter((template) => template.suggested).map((template) => template.id));
  const count = [...selected].filter((id) => available.some((template) => template.id === id)).length;

  const toggle = (id: string) => {
    const nextSet = new Set(selected);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);
    setChosen(nextSet);
  };

  const create = async () => {
    setError(null);
    if (!count) return next();
    setSaving(true);
    try {
      const { data, meta } = await createFromTemplates(client, [...selected], { menu: true });
      toast.success(
        `${data.length} page${data.length > 1 ? 's' : ''} créée${data.length > 1 ? 's' : ''} en brouillon. Adaptez-les puis publiez-les depuis Pages.`,
      );
      if (meta.notInMenu.length)
        toast.error('Le menu du site est complet : ajoutez ces pages depuis Mon site › Menu du site.');
      await next();
    } catch (caught) {
      setError(
        `Les pages n'ont pas été créées : ${caught instanceof ApiError ? caught.message : 'le serveur ne répond pas'}.`,
      );
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
          tertiary={{ label: 'Passer cette étape', onClick: () => void next() }}
          primary={{
            label: count ? `Créer ${count} page${count > 1 ? 's' : ''} et continuer` : 'Continuer',
            busy: saving,
            onClick: () => void create(),
          }}
        />
      }
    >
      {alert}
      {error && (
        <p role="alert" className="mb-5 rounded-xl border border-danger bg-danger-alert-bg p-4">
          {error}
        </p>
      )}
      <StepHeading step={step}>Vos premières pages</StepHeading>
      <p className="mt-2 text-secondary">
        Choisissez des modèles. Ils seront créés en brouillon, avec des textes à adapter, et ajoutés au menu du site.
      </p>
      {templates.isError ? (
        <p role="alert" className="mt-5 rounded-xl border border-danger bg-danger-alert-bg p-4">
          Les modèles n'ont pas pu être chargés.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void templates.refetch()}>
            Réessayer
          </Button>
        </p>
      ) : !templates.data ? (
        <div aria-busy="true" className="mt-5 h-64 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <fieldset className="mt-5">
          <legend className="sr-only">Modèles de pages</legend>
          <ul className="space-y-2">
            {templates.data.map((template) => {
              const done = !!template.page;
              const checked = done || selected.has(template.id);
              return (
                <li key={template.id}>
                  <label
                    className={cn(
                      'flex min-h-14 items-start gap-3 rounded-xl border bg-surface p-4 dark:bg-sidebar',
                      checked ? 'border-brand' : 'border-border',
                      done ? 'cursor-default' : 'cursor-pointer hover:bg-surface-hover',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={done}
                      onChange={() => toggle(template.id)}
                      className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {template.title}
                        {done && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success">
                            <Check aria-hidden="true" className="size-3" /> Déjà créée
                          </span>
                        )}
                      </span>
                      <span className="block text-[13px] text-secondary">{template.summary}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
    </WizardFrame>
  );
}
