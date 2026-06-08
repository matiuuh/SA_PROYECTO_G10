# ── Stage 1: build ────────────────────────────────────────────────────────────
# Build context: backend/   (docker-compose pasa context: ./backend)
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY services/divisas/package.json ./
RUN pnpm install --ignore-scripts

COPY services/divisas/ .
COPY proto/ ./proto/

RUN pnpm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY services/divisas/package.json ./
RUN pnpm install --ignore-scripts --prod

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/proto ./proto

RUN addgroup -S quetzal && adduser -S quetzal -G quetzal
USER quetzal

EXPOSE 5005

CMD ["node", "dist/server.js"]
