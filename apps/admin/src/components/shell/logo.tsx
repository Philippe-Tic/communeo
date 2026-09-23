import logo from '@/assets/logo-communeo.svg?raw';
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
