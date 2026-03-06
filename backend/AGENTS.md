# Backend Conventions

Strapi v5 + TypeScript 5 — Headless CMS with REST API

## Directory Structure

```
src/
  api/{entity}/
    content-types/{entity}/schema.json   # Content type definition
    controllers/{entity}.ts              # Request handlers
    routes/{entity}.ts                   # Core router
    routes/01-custom-routes.ts           # Custom routes (optional)
    services/{entity}.ts                 # Business logic
  extensions/
    users-permissions/strapi-server.ts   # Auth customizations
  middlewares/
    site-isolation.ts                    # Multi-tenant filtering (CRITICAL)
    private-network-access.ts            # CORS preflight
  services/
    deployment.ts                        # Build orchestration
    auto-deploy.ts                       # Debounced auto-deploy
    netlify.ts                           # Netlify API client
    domain.ts                            # Custom domain management
    domain-validation.ts                 # DNS validation
  utils/
    getEffectiveSite.ts                  # Resolve user's site (with impersonation)
  bootstrap.ts                           # Seed data on first startup
  index.ts                               # Strapi lifecycle hooks (document events)
```

## Content Type Schema

`api/{entity}/content-types/{entity}/schema.json`:
```json
{
  "kind": "collectionType",
  "collectionName": "{entities}",
  "info": { "singularName": "{entity}", "pluralName": "{entities}", "displayName": "{Entity}" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "title": { "type": "string", "required": true, "maxLength": 200 },
    "slug": { "type": "uid", "targetField": "title", "required": true, "unique": true },
    "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft", "required": true },
    "site": { "type": "relation", "relation": "manyToOne", "target": "api::site.site", "inversedBy": "{entities}", "required": true }
  }
}
```

Key rules:
- **Always** include `site` relation (manyToOne to `api::site.site`)
- `draftAndPublish: false` — we use custom `status` enum instead
- `slug` type is `uid` with `targetField` for auto-generation
- Update the Site schema to add the inverse `oneToMany` relation

## Controllers

Standard CRUD — use factory:
```typescript
import { factories } from '@strapi/strapi'
export default factories.createCoreController('api::{entity}.{entity}');
```

Custom actions — plain object with methods:
```typescript
export default {
  async customAction(ctx) {
    // ctx type is implicitly `any` (Strapi convention)
    const site = await getEffectiveSite(ctx);
    if (!site) return ctx.unauthorized('No site');
    // ...
    return ctx.send({ data: result });
  }
}
```

## Routes

Core routes (auto-generated CRUD):
```typescript
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::{entity}.{entity}');
```

Custom routes in `routes/01-custom-routes.ts`:
```typescript
export default {
  routes: [
    { method: 'POST', path: '/{entities}/custom', handler: '{entity}.customAction', config: { auth: false } }
  ]
};
```

The `01-` prefix ensures custom routes load before core routes.

## Services

Standard — use factory:
```typescript
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::{entity}.{entity}');
```

Custom services — singleton class pattern:
```typescript
class MyService {
  async doSomething() { /* ... */ }
}
export default new MyService();
```

## Site Isolation Middleware

**CRITICAL**: Every new content type must be registered in `src/middlewares/site-isolation.ts`:

```typescript
const contentTypes: Record<string, string> = {
  '{entities}': 'api::{entity}.{entity}',  // Add new entry here
  // ...existing entries...
};
```

The middleware handles:
- **GET list**: Adds `site.documentId` filter to query
- **GET single**: Verifies entity belongs to user's site
- **POST**: Forces `site` to user's site documentId
- **PUT/DELETE**: Verifies ownership, prevents site reassignment

Super admin with `X-Site-Document-Id` header → impersonation mode.

## Document Hooks

`src/index.ts` registers lifecycle hooks to trigger auto-deploy on content changes. Excluded content types (no deploy trigger): `deployment`, `domain`.

## Error Responses

```typescript
ctx.unauthorized('Message')      // 401
ctx.badRequest('Message')        // 400
ctx.notFound()                   // 404
ctx.forbidden('Message')         // 403
ctx.internalServerError('Message') // 500
```

## Strapi v5 Specifics

- Use `documentId` (string UUID) as canonical identifier, not numeric `id`
- `strapi.entityService.findMany(contentType, { filters, populate })` for queries
- `strapi.entityService.findOne(contentType, numericId, { populate })` for single by numeric ID
- To find by documentId: `findMany` with `filters: { documentId: { $eq: '...' } }`
- Populate accepts `['relation1', 'relation2']` or `'*'`

## getEffectiveSite(ctx)

Shared utility (`src/utils/getEffectiveSite.ts`) that resolves the site for the current request:
1. Returns `ctx.state.user.site` if already loaded
2. Otherwise loads the user's site relation from DB
3. Falls back to `ctx.state.impersonatedSite` (super admin)

## Logging

- `console.log` for development traces (with emoji prefixes)
- `strapi.log.info/warn/error` for formal production logs
