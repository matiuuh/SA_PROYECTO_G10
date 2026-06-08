# ── Stage 1: build ────────────────────────────────────────────────────────────
# Build context: backend/   (docker-compose passes context: ./backend)
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

COPY services/notificaciones/package.json ./
RUN pnpm install --ignore-scripts

COPY services/notificaciones/tsconfig.json ./
COPY services/notificaciones/src/ ./src/

RUN pnpm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache tzdata ca-certificates
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./

RUN pnpm install --ignore-scripts --prod

COPY proto /app/proto

EXPOSE 5007

CMD ["node", "dist/server.js"]
