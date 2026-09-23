# Worker de build : renderer, thèmes et dépendances de production installés dans l'image,
# aucun `npm install` au moment du build d'une commune.
# Contexte de build : racine du monorepo
#   docker build -f apps/worker/Dockerfile .

FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
# Binaires natifs pour Alpine seulement (pnpm installerait aussi les variantes glibc)
RUN printf '\nsupportedArchitectures:\n  os: [current]\n  cpu: [current]\n  libc: [musl]\n' >> pnpm-workspace.yaml

COPY packages packages
COPY themes themes
COPY apps/renderer apps/renderer
COPY apps/worker apps/worker
ENV CI=true
RUN pnpm install --frozen-lockfile --filter "@communeo/worker..." --filter "@communeo/renderer..."

# Paquets du workspace (pipeline, core…) et worker ; le renderer lui-même est construit par commune
RUN pnpm --filter "@communeo/worker..." --filter "@communeo/renderer^..." build

# Dossiers autonomes avec les seules dépendances de production (paquets du workspace copiés)
RUN pnpm deploy --filter @communeo/renderer --prod --legacy /out/renderer \
 && pnpm deploy --filter @communeo/worker --prod --legacy /out/worker \
 && cp -r apps/worker/dist /out/worker/dist

FROM node:22-alpine

ENV NODE_ENV=production \
    RENDERER_DIR=/app/renderer \
    WORK_DIR=/tmp/communeo-builds

WORKDIR /app
# Le renderer écrit ses caches (.astro, Vite) dans son dossier : il appartient à l'utilisateur node
COPY --from=builder --chown=node:node /out /app
USER node

CMD ["node", "worker/dist/main.js"]
