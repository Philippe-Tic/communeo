import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Bandeau du super admin qui consulte l'administration d'une commune : au-dessus de tout, pousse le contenu. */
export function ImpersonationBanner({ siteName, onQuit }: { siteName: string; onQuit: () => void }) {
  return (
    <div role="region" aria-label="Mode équipe Communeo" className="flex items-center gap-3 bg-[#1C1B18] px-4 py-2.5 text-sm text-white md:px-6">
      <ShieldAlert aria-hidden="true" className="size-5 shrink-0 text-[#F5C97A]" />
      <p className="flex-1">
        <strong className="font-semibold">Mode équipe Communeo</strong> — Vous consultez l'administration de {siteName}. Vos actions sont
        enregistrées.
      </p>
      <Button variant="secondary" size="sm" className="border-white bg-white text-[#1C1B18] hover:bg-[#F1EFE6]" onClick={onQuit}>
        Quitter
      </Button>
    </div>
  );
}
