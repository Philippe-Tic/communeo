# Worker de build : renderer, thèmes et leurs dépendances installés dans l'image,
# aucun `npm install` au moment du build d'une commune.
# Contexte de build : racine du monorepo
#   docker build -f apps/worker/Dockerfile .

FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages packages
COPY themes themes
COPY apps/renderer apps/renderer
COPY apps/worker apps/worker
RUN pnpm install --frozen-lockfile --filter "@communeo/worker..." --filter "@communeo/renderer..."

# Paquets du workspace (pipeline, core…) et worker ; le renderer lui-même est construit par commune
RUN pnpm --filter "@communeo/worker..." --filter "@communeo/renderer^..." build

FROM node:22-alpine

ENV NODE_ENV=production \
    RENDERER_DIR=/repo/apps/renderer \
    WORK_DIR=/tmp/communeo-builds

WORKDIR /repo
# Le renderer écrit ses caches (.astro, Vite) dans son dossier : il appartient à l'utilisateur node
COPY --from=builder --chown=node:node /repo /repo
USER node

CMD ["node", "apps/worker/dist/main.js"]
