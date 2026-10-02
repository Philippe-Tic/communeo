/**
 * Pourquoi « non conforme » sans audit (#365) : la loi, ce que Communeo fait déjà, ce qui dépend de la
 * commune, comment changer de niveau. Assistant (étape des obligations) et écran Accessibilité.
 */
import { InfoBubble } from '@/components/ui/info-bubble';

export function AccessibilityHelp({ className }: { className?: string }) {
  return (
    <InfoBubble
      label="Pourquoi « non conforme » ?"
      title="Pourquoi « non conforme » sans audit ?"
      className={className}
    >
      <p>
        La loi oblige chaque commune à publier une déclaration d’accessibilité. Tant qu’aucun audit selon le RGAA (le
        référentiel officiel) n’a été réalisé, le seul niveau que l’on peut déclarer est «&nbsp;non conforme&nbsp;».{' '}
        <strong>Ce n’est pas un défaut de votre site</strong> : c’est la mention imposée en l’absence d’audit.
      </p>
      <p>
        <strong>Ce que Communeo fait déjà.</strong> Les thèmes sont conçus selon les critères WCAG 2.2 niveau AA
        (contrastes, navigation au clavier, lecteurs d’écran, affichage sur petit écran) et vérifiés à chaque évolution
        ; la déclaration, le contact et les voies de recours sont déjà sur le site.
      </p>
      <p>
        <strong>Ce qui dépend de la commune.</strong> Vos contenus : un texte alternatif pour chaque image, des
        documents PDF accessibles (ou leur contenu repris dans une page), des titres et des liens explicites, des vidéos
        sous-titrées.
      </p>
      <p>
        <strong>Pour changer de niveau.</strong> Faites réaliser un audit RGAA par un prestataire spécialisé (parfois
        proposé par l’intercommunalité ou le centre de gestion). Selon le résultat, déclarez «&nbsp;partiellement
        conforme&nbsp;» (50 à 99&nbsp;% des critères) ou «&nbsp;totalement conforme&nbsp;» (100&nbsp;%) dans Mon site ›
        Accessibilité, et ajoutez la date et l’auteur de l’audit dans les compléments de la déclaration.
      </p>
    </InfoBubble>
  );
}
