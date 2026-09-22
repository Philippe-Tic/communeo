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
RUN pnpm install --frozen-lockfile --filter @communeo/backend...

COPY apps/backend apps/backend
RUN NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @communeo/backend build

# Dossier autonome avec les seules dépendances de production
RUN pnpm deploy --filter @communeo/backend --prod --legacy /out \
 && cp -r apps/backend/dist /out/dist

# --- Production stage ---
FROM node:22-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV SITES_PATH=/sites

WORKDIR /app

COPY --from=builder /out ./

# Le service de déploiement (V1) a besoin du runtime Node.js complet
# pour exécuter npm ci et npx astro build dans des dossiers temporaires

EXPOSE 1337

CMD ["npm", "run", "start"]
