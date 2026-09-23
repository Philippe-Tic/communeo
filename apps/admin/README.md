# Admin V2

Nouvelle administration (React 19 + Vite + TanStack Router/Query + Tailwind 4 + Radix), phase 3 (epic #130).
Maquettes : `v2/Design Admin Handoff/`. L'admin V1 gelée est dans `admin/` à la racine.

```bash
pnpm --filter @communeo/admin dev        # http://localhost:5173, API Strapi via le proxy Vite (VITE_API_URL, défaut localhost:1337)
pnpm --filter @communeo/admin test:e2e   # build + Playwright (axe WCAG 2.2 AA, clavier) en 1440, 1366 et 390 px, API simulée (e2e/api.ts)
```

## Écrans

Un fichier par écran dans `src/routes` ; tout ce qui est sous `_app/` est protégé et affiché dans le shell.
Chaque écran commence par `<PageHeader title=…>` (titre h1, titre du document, focus après navigation).
`/composants` (hors navigation) montre le kit sur l'exemple « Nouvel événement ».

## Formulaires (`src/components/form`)

- `useZodForm(schema, defaults)` + `<Form form onSubmit summaryTitle>` : schéma zod (celui de `@communeo/core` quand il existe),
  récapitulatif d'erreurs en tête (`role="alert"`, focus à la soumission, liens vers les champs), phrase qui explique l'astérisque.
- Champs : `TextField` (avec `prefix`), `TextareaField`, `SelectField`, `DateField`, `TimeField` (h / min au pas de 15 min),
  `CheckboxField`, `SwitchField`, `RadioGroupField` (`cards` pour les radios « carte »). Libellé relié, obligatoire = astérisque
  + `aria-required`, facultatif = « (facultatif) » dans le libellé, aide et erreur dans `aria-describedby`.
- `FormSection title fields` : carte de section avec le nombre d'erreurs de ses champs.
- Vérifications entre champs (zod 4) : `.refine(…, { path, message, when })`. Sans `when`, zod ne les lance qu'une fois tous
  les autres champs valides et l'erreur n'apparaît qu'à la deuxième tentative.
- `UnsavedChangesGuard when={isDirty}` : fenêtre « Modifications non enregistrées » (navigation dans l'admin et fermeture de l'onglet).

## Fenêtres et notifications

- `ConfirmDialog` (suppression : `alertdialog`, focus sur « Annuler », retour du focus au déclencheur) ; jamais `window.confirm`.
- `toast.success / error / network` : succès 6 s dans une région `status`, erreurs persistantes dans une région `alert`.

## Éditeur de blocs (`src/components/blocks`)

- `<BlockEditor name="blocks" />` dans un `Form` : liste de blocs (useFieldArray), catalogue, déplacement (glisser-déposer,
  Espace + flèches, boutons), duplication, suppression annulable, annonces des positions.
- Schéma : `blocks: blocksSchema('publish' | 'draft')` (règles de `@communeo/core`, les mêmes que le backend) ; récapitulatif :
  `describeError={(name, message) => describeBlockError(name, message, blocks)}` (« Bloc 5 (Vidéo) : … »).
- Texte riche : `RichTextField` (TipTap limité aux nœuds acceptés par core : un H1 ou du HTML collé est ramené à H2 / H3,
  paragraphes, listes, gras, italique, liens sûrs). Barre d'outils à une tabulation (flèches), Ctrl+K pour les liens.
- Page de référence : `/editeur-de-blocs`. Blocs Image, Galerie et Documents : modifiables avec la médiathèque (#142).

## Éditeur de contenu et preview (`src/components/editor`)

- `/pages/$documentId` (`nouvelle` pour créer) : `PageEditor` — enregistrement automatique (`useAutosave`, ~5 s), Publier / Programmer
  (heure de Paris, `lib/dates.ts`), suppression. Écriture vers Strapi : `lib/content-api.ts` (blocs sans `id`, médias par identifiant).
- Preview : jeton signé (`lib/preview.ts`, `POST /api/preview/token`), iframe du vrai serveur de preview (`PreviewView`),
  largeurs 390 / 768 / 1280 réduites pour tenir, rechargée après chaque enregistrement (paramètre `v`), panneau
  redimensionnable (`role="separator"`) et masquable à partir de 1200 px, tiroir en dessous, plein écran sur mobile.
  En développement : lancer le renderer en mode serveur (`PREVIEW_SECRET`, `PREVIEW_FRAME_ANCESTORS=http://localhost:5173`)
  et Strapi avec le même `PREVIEW_SECRET` et `PREVIEW_URL`.
