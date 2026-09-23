import { useEffect, type ReactNode } from 'react';
import { CommuneoLogo } from '@/components/shell/logo';

/** Écrans d'accès (connexion, mot de passe, invitation) : logo et carte centrée (maquettes 6.19) */
export function AuthLayout({ title, documentTitle, children }: { title: ReactNode; documentTitle: string; children: ReactNode }) {
  useEffect(() => {
    document.title = `${documentTitle} · Communeo`;
  }, [documentTitle]);
  return (
    <main className="grid min-h-dvh place-items-start px-4 py-10 md:place-items-center">
      <div className="mx-auto w-full max-w-[400px]">
        <CommuneoLogo className="mx-auto mb-8 block w-40" />
        <div className="rounded-xl border border-border bg-surface p-6 md:p-7 dark:bg-sidebar">
          <h1 className="text-[22px]">{title}</h1>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </main>
  );
}
