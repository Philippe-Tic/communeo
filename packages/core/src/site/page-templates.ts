/**
 * Modèles de pages (#153) : cinq pages de démarrage, en blocs, créées en brouillon depuis
 * l'assistant de création ou la liste des pages. Chaque page s'ouvre sur un encadré « Modèle à
 * adapter » ; ce que seule la commune sait est laissé [entre crochets]. Les liens mènent aux
 * rubriques du site (contact, démarches, documents, cantine).
 */
import type { RichTextDocument } from '../blocks/rich-text';
import { heading, list, paragraph } from './legal-templates';
import { summarizeWeek, type OpeningHours } from './opening-status';

export interface PageTemplateContext {
  communeName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  hours?: OpeningHours | null;
}

type Block = { __component: string } & Record<string, unknown>;

export interface PageTemplate {
  id: string;
  title: string;
  /** Ce que contient la page, en une ligne (choix du modèle) */
  summary: string;
  /** Coché par défaut dans l'assistant */
  suggested: boolean;
  blocks: (context: PageTemplateContext) => Block[];
}

const doc = (...content: unknown[]) => ({ type: 'doc', content }) as RichTextDocument;
const text = (...content: unknown[]): Block => ({ __component: 'blocks.text', body: doc(...content) });
const toAdapt: Block = {
  __component: 'blocks.callout',
  variant: 'info',
  title: 'Modèle à adapter',
  body: doc(paragraph('Complétez les passages entre crochets et vérifiez chaque information avant de publier la page.')),
};
const buttons = (...items: Array<[label: string, url: string]>): Block => ({
  __component: 'blocks.buttons',
  buttons: items.map(([label, url], index) => ({ label, url, style: index === 0 ? 'primary' : 'secondary' })),
});

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'salle-des-fetes',
    title: 'Location de la salle des fêtes',
    summary: 'Description, tarifs, règlement, formulaire de demande',
    suggested: true,
    blocks: ({ communeName }) => [
      toAdapt,
      text(
        heading('La salle'),
        paragraph(`La salle des fêtes de ${communeName} peut accueillir [nombre] personnes. Elle dispose de [cuisine équipée, tables et chaises…].`),
        heading('Tarifs'),
        list([
          'Habitants de la commune : [montant] € le week-end ;',
          'Personnes extérieures à la commune : [montant] € le week-end ;',
          'Associations de la commune : [gratuit ou montant].',
        ]),
        heading('Réserver'),
        paragraph(
          'Les réservations se font auprès de la mairie, au moins [délai] à l’avance. Un contrat de location et une attestation d’assurance sont demandés.',
        ),
      ),
      buttons(['Demander une réservation', '/contact']),
      {
        __component: 'blocks.faq',
        title: 'Questions fréquentes',
        items: [
          {
            question: 'Faut-il une assurance ?',
            answer: doc(paragraph('Oui : une attestation d’assurance responsabilité civile est demandée à la réservation.')),
          },
          {
            question: 'Un dépôt de garantie est-il demandé ?',
            answer: doc(paragraph('Oui : [montant] €, rendu après l’état des lieux de sortie.')),
          },
        ],
      },
    ],
  },
  {
    id: 'etat-civil',
    title: 'État civil',
    summary: 'Actes, mariage, PACS, recensement, avec les démarches en ligne',
    suggested: true,
    blocks: () => [
      toAdapt,
      text(
        heading('Demander un acte'),
        paragraph(
          'Les actes de naissance, de mariage et de décès se demandent à la mairie du lieu de l’événement, sur place, par courrier ou en ligne.',
        ),
      ),
      buttons(['Voir les démarches en ligne', '/demarches']),
      text(
        heading('Mariage et PACS'),
        paragraph('Le dossier de mariage est à retirer en mairie [délai] avant la date souhaitée. Le PACS est enregistré en mairie sur rendez-vous.'),
        heading('Recensement citoyen'),
        paragraph(
          'Les jeunes de 16 ans se font recenser dans les trois mois qui suivent leur anniversaire, en mairie avec une pièce d’identité et le livret de famille, ou en ligne.',
        ),
      ),
    ],
  },
  {
    id: 'urbanisme',
    title: 'Urbanisme',
    summary: 'PLU, permis, déclarations préalables',
    suggested: true,
    blocks: () => [
      toAdapt,
      text(
        heading('Règles d’urbanisme'),
        paragraph('Le [plan local d’urbanisme ou la carte communale] est consultable en mairie et parmi les documents officiels du site.'),
      ),
      buttons(['Consulter les documents d’urbanisme', '/documents']),
      text(
        heading('Autorisations'),
        list([
          'Déclaration préalable : petits travaux (clôture, abri de jardin, ravalement…) ;',
          'Permis de construire : constructions nouvelles et agrandissements importants ;',
          'Certificat d’urbanisme : connaître les règles applicables à un terrain.',
        ]),
        paragraph('Les demandes se déposent en mairie ou en ligne [adresse du guichet numérique].'),
      ),
    ],
  },
  {
    id: 'inscriptions-scolaires',
    title: 'Inscriptions scolaires',
    summary: 'Calendrier, pièces à fournir, cantine et périscolaire',
    suggested: true,
    blocks: () => [
      toAdapt,
      text(
        heading('Calendrier'),
        paragraph('Les inscriptions pour la rentrée [année] ont lieu du [date] au [date], en mairie.'),
        heading('Pièces à fournir'),
        list([
          'le livret de famille ou un acte de naissance de l’enfant ;',
          'un justificatif de domicile de moins de trois mois ;',
          'le carnet de santé (vaccinations obligatoires).',
        ]),
        heading('Cantine et accueil périscolaire'),
        paragraph('L’inscription à la cantine et à l’accueil périscolaire se fait [en mairie ou en ligne]. Les menus sont publiés sur le site.'),
      ),
      buttons(['Voir les menus de la cantine', '/cantine']),
    ],
  },
  {
    id: 'contact-services',
    title: 'Contacter les services',
    summary: 'Coordonnées, horaires, formulaire de contact',
    suggested: false,
    blocks: ({ communeName, address, phone, email, hours }) => [
      text(paragraph('La mairie vous accueille aux horaires ci-dessous et vous répond par écrit.')),
      {
        __component: 'blocks.contact',
        name: `Mairie de ${communeName}`,
        address: address ?? '',
        phone: phone ?? '',
        email: email ?? '',
        hours: hours
          ? summarizeWeek(hours)
              .map((group) => `${group.days} : ${group.hours}`)
              .join(' · ')
          : '',
        show_map: false,
      },
      buttons(['Écrire à la mairie', '/contact']),
    ],
  },
];

export const pageTemplate = (id: string) => PAGE_TEMPLATES.find((template) => template.id === id);
