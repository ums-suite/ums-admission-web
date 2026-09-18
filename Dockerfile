# syntax=docker/dockerfile:1
#
# Builds ums-admission-web's SSR bundle. Two-stage build, mirroring ums-core's own Dockerfile
# rationale: the `build` stage needs the full Node/npm toolchain plus devDependencies (the
# Angular CLI/compiler) to run `ng build`; the `runtime` stage copies only the compiled
# `dist/admission-web/{browser,server}` output into a slim Node image, so the final image ships
# neither devDependencies nor the Angular build tooling.
#
# API_BASE_URL (build arg): Angular inlines `environment.ts` into the compiled bundle at build
# time - it is not a runtime-configurable value - so this app's API base URL has to be baked in
# here rather than passed as a container env var. Defaults to the browser-reachable
# host-published ums-core port (matches ums-devops's own UMS_CORE_PORT default) because every API
# call this app's own browser bundle makes originates client-side (see this repo's own
# src/app/core/http/provide-core-http.ts). See ums-devops's docker-compose.yml "Frontend API base
# URL" comment for the full reasoning and its one known limitation (server-rendered routes'
# own data-fetch calls use this same URL, which is only reachable from the host, not from inside
# this container).

FROM node:22-alpine AS build
WORKDIR /app

# package*.json + vendor/ first (not the whole source tree) so `npm ci` gets its own cached layer
# - vendor/*.tgz has to come along because package.json pins @ums/design-system and @ums/shared
# as `file:vendor/...tgz` dependencies (this repo's own README "Local package consumption").
COPY package.json package-lock.json ./
COPY vendor/ ./vendor/
RUN npm ci

COPY . .

ARG API_BASE_URL=http://localhost:8080
RUN sed -i "s#apiBaseUrl: '[^']*'#apiBaseUrl: '${API_BASE_URL}'#" src/environments/environment.ts

RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist/admission-web/ ./dist/admission-web/

# The server's own PORT env var support (src/server.ts: `process.env['PORT'] || 4000`) - not
# hardcoded here so ums-devops's docker-compose.yml can still override it if ever needed.
EXPOSE 4000

# node:22-alpine's own built-in unprivileged "node" user, not root - same non-root practice as
# ums-core's own Dockerfile (`USER $APP_UID`).
USER node

CMD ["node", "dist/admission-web/server/server.mjs"]
