# Migrations de données

Strapi exécute au démarrage, dans l'ordre alphabétique, les fichiers de ce dossier qui n'ont pas encore été
appliqués (suivi dans la table `strapi_migrations`). Nommer les fichiers par date : `2026.10.01T00.00.00.nom-court.js`.

```js
module.exports = {
  async up(knex) {
    // modifications de données avec knex
  },
};
```

Les changements de schéma (ajout de champs, de content-types) sont appliqués automatiquement par Strapi
à partir des `schema.json` : une migration ne sert qu'à transformer des données existantes.
Ne jamais mettre de migration de données dans `src/bootstrap/`.
