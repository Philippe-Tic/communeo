# Image « web » : nginx (reverse proxy de Strapi et de la preview, TLS) avec l'admin compilée.
# Remplace la copie manuelle de apps/admin/dist sur le serveur. Contexte de build : racine du monorepo
#   docker build -f apps/admin/Dockerfile --build-arg VITE_TERMS_URL=https://… .

FROM node:22-alpine AS builder

RUN corepack enable
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
# Binaires natifs pour Alpine seulement
RUN printf '\nsupportedArchitectures:\n  os: [current]\n  cpu: [current]\n  libc: [musl]\n' >> pnpm-workspace.yaml

COPY packages packages
# Vignettes des thèmes (écran Apparence)
COPY themes themes
COPY apps/admin apps/admin
ENV CI=true
RUN pnpm install --frozen-lockfile --filter "@communeo/admin..."
RUN pnpm --filter "@communeo/admin^..." build

# Conditions d'utilisation liées depuis l'inscription (#315)
ARG VITE_TERMS_URL=""
ENV VITE_TERMS_URL=${VITE_TERMS_URL}
RUN pnpm --filter @communeo/admin build

FROM nginx:1.29-alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/templates /etc/nginx/templates
COPY nginx/reload-certs.sh /docker-entrypoint.d/90-reload-certs.sh
COPY --from=builder /repo/apps/admin/dist /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q --spider http://127.0.0.1/healthz || exit 1
