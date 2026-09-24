/**
 * Textes pré-remplis de l'assistant de création (#152), à relire par la commune : politique de
 * données personnelles et déclaration d'accessibilité initiale (texte riche restreint). Les pages
 * publiques y ajoutent ce qui ne change pas d'une commune à l'autre (droits, recours, cookies…).
 * Rien n'y est affirmé que la plateforme ne fasse pas réellement.
 */
import type { RichTextDocument } from '../blocks/rich-text';

const text = (value: string) => ({ type: 'text' as const, text: value });
const paragraph = (value: string) => ({ type: 'paragraph' as const, content: [text(value)] });
const heading = (value: string) => ({ type: 'heading' as const, attrs: { level: 2 as const }, content: [text(value)] });
const list = (items: string[]) => ({
  type: 'bulletList' as const,
  content: items.map((item) => ({ type: 'listItem' as const, content: [paragraph(item)] })),
});

export function privacyPolicyTemplate({ communeName }: { communeName: string }): RichTextDocument {
  return {
    type: 'doc',
    content: [
      heading('Données collectées sur ce site'),
      paragraph(`La mairie de ${communeName} collecte des données personnelles uniquement lorsque vous les lui transmettez :`),
      list([
        'par le formulaire de contact : nom, prénom, adresse e-mail, téléphone (facultatif) et le contenu de votre message, pour répondre à votre demande ;',
        "par l'inscription à la lettre d'information : votre adresse e-mail, pour vous envoyer les actualités de la commune. Chaque envoi contient un lien pour vous désinscrire ;",
        "par une demande d'exercice de vos droits : les informations nécessaires pour la traiter.",
      ]),
      heading('Base légale'),
      paragraph(
        "Le traitement de vos messages relève de l'exécution d'une mission d'intérêt public (article 6.1.e du RGPD). L'envoi de la lettre d'information repose sur votre consentement (article 6.1.a).",
      ),
      heading('Destinataires'),
      paragraph(
        `Vos données sont destinées aux agents et aux élus de la mairie de ${communeName} chargés de traiter votre demande. Elles sont hébergées par le prestataire du site, qui agit pour le compte de la mairie. Elles ne sont ni vendues ni cédées.`,
      ),
      heading('Durée de conservation'),
      paragraph(
        "Vos messages sont conservés le temps de traiter votre demande, puis selon les règles applicables aux archives publiques. L'adresse d'un abonné n'est plus utilisée dès sa désinscription.",
      ),
    ],
  } as RichTextDocument;
}

export function accessibilityDeclarationTemplate({ date }: { date: Date }): RichTextDocument {
  const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(date);
  return {
    type: 'doc',
    content: [
      heading('Contenus non accessibles'),
      paragraph("Tant qu'un audit de conformité n'a pas été réalisé, les contenus suivants peuvent ne pas être accessibles :"),
      list([
        'certains documents à télécharger (PDF, documents bureautiques), en particulier les plus anciens ;',
        'les contenus proposés par des services extérieurs (vidéos, cartes).',
      ]),
      heading('Établissement de cette déclaration'),
      paragraph(`Cette déclaration a été établie le ${day}. Le site n'a pas encore fait l'objet d'un audit de conformité au RGAA.`),
      paragraph('Technologies utilisées pour la réalisation du site : HTML, CSS, JavaScript.'),
    ],
  } as RichTextDocument;
}

/** Sans audit, un site se déclare « non conforme » (obligation du RGAA) */
export const DEFAULT_ACCESSIBILITY_LEVEL = 'non-conforme';
