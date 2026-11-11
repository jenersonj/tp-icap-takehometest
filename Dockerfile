# syntax=docker/dockerfile:1.7
# One Dockerfile for every app. Build with:
#   --build-arg APP=@blotter/api --build-arg APP_DIR=backend/api --target nest
#   --build-arg APP=@blotter/frontend --build-arg APP_DIR=frontend --target web

FROM node:22-alpine AS base
# node:22-alpine already ships libssl 3, which is all Prisma's query engine needs.
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true TURBO_TELEMETRY_DISABLED=1 NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo

# 1. Keep only the workspaces the app depends on (Turborepo prune).
FROM base AS prune
ARG APP
COPY . .
RUN pnpm dlx turbo@2.11.10 prune "${APP}" --docker

# 2. Install (cached on the lockfile), then build the app and its workspace dependencies.
FROM base AS build
ARG APP
ARG API_INTERNAL_URL=http://api:3000
ARG REALTIME_INTERNAL_URL=http://realtime:3001
ENV API_INTERNAL_URL=${API_INTERNAL_URL} REALTIME_INTERNAL_URL=${REALTIME_INTERNAL_URL}
COPY --from=prune /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN pnpm turbo run build --filter="${APP}"

# 3a. NestJS apps (api, service, realtime).
FROM base AS nest
ARG APP_DIR
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo /repo
WORKDIR /repo/${APP_DIR}
USER node
CMD ["node", "dist/main.js"]

# 3b. Next.js standalone server.
FROM node:22-alpine AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=8080 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/frontend/.next/standalone ./
COPY --from=build --chown=node:node /repo/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /repo/frontend/public ./frontend/public
USER node
EXPOSE 8080
CMD ["node", "frontend/server.js"]
