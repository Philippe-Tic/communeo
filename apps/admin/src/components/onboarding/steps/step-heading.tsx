import { useEffect, useRef, type ReactNode } from 'react';
import { focusHeadingIfRequested } from '@/lib/focus';
import { ONBOARDING_STEPS, TOTAL_STEPS } from '@/lib/onboarding';

/** Titre d'une étape : focus à chaque changement d'étape, titre du document « Étape n sur 7 » */
export function StepHeading({ step, children, className }: { step: number; children: ReactNode; className?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), [step]);
  useEffect(() => {
    document.title = `${ONBOARDING_STEPS[step - 1]!.label} — étape ${step} sur ${TOTAL_STEPS} · Communeo`;
  }, [step]);
  return (
    <h1 ref={heading} className={className ?? 'outline-none'}>
      {children}
    </h1>
  );
}
