/**
 * Référence de l'éditeur de blocs (hors navigation) : sert de page de test (e2e/blocks.spec.ts)
 * en attendant les écrans de contenus (#137, #138).
 */
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { blocksSchema, BlockEditor, describeBlockError, type Block } from '@/components/blocks';
import { Form, FormSection, TextField, useZodForm } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

export const Route = createFileRoute('/_app/editeur-de-blocs')({ component: BlockEditorPage });

const p = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

export const SAMPLE_BLOCKS: Block[] = [
  {
    __component: 'blocks.text',
    id: 11,
    body: {
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Tarifs de location' }] }, p('La salle des fêtes accueille jusqu’à 180 personnes.')],
    },
  },
  { __component: 'blocks.callout', id: 12, variant: 'warning', title: 'Caution', body: { type: 'doc', content: [p('Une caution de 500 € est demandée à la réservation.')] } },
  { __component: 'blocks.image', id: 13, image: { id: 4, name: 'salle-des-fetes.svg', url: '/favicon.svg', ext: '.svg', size: 1, alternativeText: 'La salle des fêtes vue de la place', mime: 'image/svg+xml' }, caption: 'La salle rénovée en 2024', width: 'normal' },
  {
    __component: 'blocks.faq',
    id: 14,
    title: 'Questions fréquentes',
    items: [{ id: 1, question: 'Peut-on réserver le week-end ?', answer: { type: 'doc', content: [p('Oui, du vendredi soir au dimanche soir.')] } }],
  },
  { __component: 'blocks.video', id: 15, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: '', transcript: '' },
];

const schema = z.object({
  title: z.string().trim().min(1, 'Le titre est obligatoire'),
  blocks: blocksSchema('publish'),
});

function BlockEditorPage() {
  const form = useZodForm(schema, { title: 'Location de la salle des fêtes', blocks: SAMPLE_BLOCKS });
  return (
    <>
      <PageHeader title="Éditeur de blocs" description="Référence de l'éditeur de contenu en blocs (page « Location de la salle des fêtes »)." />
      <div className="max-w-[760px]">
        <Form
          form={form}
          onSubmit={() => toast.success('Publié. Votre site sera mis à jour dans quelques instants.')}
          summaryTitle={(count) => `${count} erreur${count > 1 ? 's empêchent' : ' empêche'} la publication`}
          describeError={(name, message) => describeBlockError(name, message, form.getValues('blocks') as Block[])}
        >
          <FormSection title="En-tête" fields={['title']}>
            <TextField name="title" label="Titre" required />
          </FormSection>
          <div className="mt-6">
            <BlockEditor name="blocks" />
          </div>
          <div className="mt-6 flex gap-2">
            <Button type="submit">Publier</Button>
          </div>
        </Form>
      </div>
    </>
  );
}
