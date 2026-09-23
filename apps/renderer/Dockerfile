# Serveur de preview : le renderer en mode serveur (SSR), tous les thèmes, brouillons lus avec le
# « Preview Token ». Contexte de build : racine du monorepo
#   docker build -f apps/renderer/Dockerfile .

FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
# Binaires natifs pour Alpine seulement
RUN printf '\nsupportedArchitectures:\n  os: [current]\n  cpu: [current]\n  libc: [musl]\n' >> pnpm-workspace.yaml

COPY packages packages
COPY themes themes
COPY apps/renderer apps/renderer
ENV CI=true
RUN pnpm install --frozen-lockfile --filter "@communeo/renderer..."
RUN pnpm --filter "@communeo/renderer^..." build

# Dossier autonome (dépendances de production), puis build du serveur
RUN pnpm deploy --filter @communeo/renderer --prod --legacy /out/renderer
WORKDIR /out/renderer
RUN RENDER_MODE=server DATA_SOURCE=strapi OUT_DIR=/out/renderer/dist node node_modules/astro/bin/astro.mjs build

FROM node:22-alpine

ENV NODE_ENV=production \
    RENDER_MODE=server \
    DATA_SOURCE=strapi \
    CONTENT_STATUS=draft \
    HOST=0.0.0.0 \
    PORT=4321

WORKDIR /app
COPY --from=builder /out/renderer /app
USER node
EXPOSE 4321

CMD ["node", "dist/server/entry.mjs"]
