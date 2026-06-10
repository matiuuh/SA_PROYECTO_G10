# ── Stage 1: build ────────────────────────────────────────────────────────────
# Build context: backend/   (docker-compose passes context: ./backend)
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

COPY services/cobros/package.json ./
RUN pnpm install --ignore-scripts

COPY services/cobros/tsconfig.json ./
COPY services/cobros/src/ ./src/

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

EXPOSE 5006
EXPOSE 8006

CMD ["node", "dist/server.js"]
