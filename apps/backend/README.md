# @communeo/backend

API Strapi 5 de Communeo : contenus des communes, isolation multi-tenant, publication des sites.

```bash
pnpm --filter @communeo/backend dev    # http://localhost:1337 (SQLite dans .tmp/)
pnpm --filter @communeo/backend test   # tests d'intégration (Strapi réel, base jetable)
```

- `config/permissions.ts` : permissions des rôles, déclarées dans le code et appliquées au démarrage
- `src/middlewares/site-isolation.ts` : isolation par commune (tout ce qui n'est pas autorisé est refusé)
- `src/validation/` : blocs, page d'accueil, slugs par commune
- `src/bootstrap/` : inscription fermée, permissions, comptes de développement, token de build
- `database/migrations/` : migrations de données
- `tests/` : tests d'intégration (à compléter pour tout nouveau content-type rattaché à un site)
