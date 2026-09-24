/** Journal d'activité de toute la plateforme (espace de l'équipe Communeo) */
import { useEffect, useRef } from 'react';
import { ActivityLog } from '@/components/activity/activity-log';
import { focusHeadingIfRequested } from '@/lib/focus';

export function PlatformJournalScreen() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = "Journal d'activité · Équipe Communeo";
  }, []);
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 ref={heading} className="outline-none">
          Journal d'activité
        </h1>
        <p className="mt-1 text-secondary">
          Toutes les communes : connexions, publications, suppressions, rôles, thèmes, domaines, communes.
        </p>
      </div>
      <ActivityLog platform />
    </div>
  );
}
