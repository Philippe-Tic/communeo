import logo from '@/assets/logo-communeo.svg?raw';
import picto from '@/assets/picto-communeo.svg?raw';
import { cn } from '@/lib/utils';

/** Logo Communeo : vert en mode clair, clair en mode sombre (couleur du texte courant). */
export function CommuneoLogo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Communeo"
      className={cn('inline-block text-brand [&_svg]:h-auto [&_svg]:w-full dark:text-text', className)}
      dangerouslySetInnerHTML={{ __html: logo }}
    />
  );
}

/** Pictogramme Communeo seul (couleur du texte courant), décoratif : le nom est écrit à côté. */
export function CommuneoPicto({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block [&_svg]:h-auto [&_svg]:w-full', className)}
      dangerouslySetInnerHTML={{ __html: picto }}
    />
  );
}
