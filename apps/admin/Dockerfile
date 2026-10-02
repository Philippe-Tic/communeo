# Image « web » : Caddy (#381 : reverse proxy de Strapi et de la preview, origine des sites des communes,
# certificats Let's Encrypt) avec l'admin compilée et sa configuration (caddy/Caddyfile). Tout est dans
# l'image : le serveur ne reçoit que docker-compose.yml et deploy.sh, et un retour arrière remet la
# configuration de la version. Contexte de build : racine du monorepo
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

FROM caddy:2.11-alpine

COPY caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /repo/apps/admin/dist /srv/admin
# Volume des sites (écrit par le worker, utilisateur node = 1000) : même propriétaire quel que soit le
# conteneur qui le crée en premier
RUN mkdir -p /srv/sites && chown 1000:1000 /srv/sites \
 && DOMAIN=app.example.org PREVIEW_DOMAIN=preview.example.org ORIGIN_DOMAIN=origine.example.org \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q --spider http://127.0.0.1/healthz || exit 1
