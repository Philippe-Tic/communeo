# Contexte de build : racine du monorepo
#   docker build -f apps/backend/Dockerfile .

# --- Builder stage ---
FROM node:22-alpine AS builder

RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev python3
RUN corepack enable

WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/backend/src/providers apps/backend/src/providers
COPY packages/core/package.json packages/core/
COPY packages/pipeline/package.json packages/pipeline/
RUN pnpm install --frozen-lockfile --filter @communeo/backend...

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY packages/pipeline packages/pipeline
COPY apps/backend apps/backend
# Construit @communeo/core, @communeo/pipeline puis le backend
RUN NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter "@communeo/backend..." build

# Dossier autonome avec les seules dépendances de production
RUN pnpm deploy --filter @communeo/backend --prod --legacy /out \
 && cp -r apps/backend/dist /out/dist

# --- Production stage ---
FROM node:22-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /app

COPY --from=builder /out ./

# Les sites ne sont pas construits ici : voir le worker (apps/worker/Dockerfile)

EXPOSE 1337

CMD ["npm", "run", "start"]
