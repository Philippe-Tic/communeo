/**
 * Jauge circulaire du score de conformité (handoff 6.6 et 6.17) : anneau `brand` sur `border`, le
 * pourcentage écrit au centre. `inner` : fond du centre, celui de la surface qui porte la jauge.
 */
import { cn } from '@/lib/utils';

export function ComplianceGauge({
  score,
  size = 96,
  inner = 'bg-bg',
}: {
  score: number;
  size?: number;
  inner?: string;
}) {
  const ring = Math.round(size / 8);
  return (
    <div
      role="img"
      aria-label={`Score de conformité : ${score} %`}
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--color-brand) ${score * 3.6}deg, var(--color-border) 0)`,
      }}
    >
      <span
        aria-hidden="true"
        className={cn('grid place-items-center rounded-full font-semibold', inner)}
        style={{ width: size - 2 * ring, height: size - 2 * ring, fontSize: size >= 90 ? 22 : 15 }}
      >
        {score} %
      </span>
    </div>
  );
}
