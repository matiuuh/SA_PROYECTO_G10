# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# URLs de API inyectadas en build time como ARGs (baked into el bundle de Vite).
# El api-gateway de VM4 las intercepta — son rutas relativas al mismo origen.
ARG VITE_USUARIO_API_URL=/api/usuario
ARG VITE_SUSCRIPCION_API_URL=/api/suscripcion
ARG VITE_CATALOGO_API_URL=/api/catalogo
ARG VITE_STREAMING_API_URL=/api/streaming
ARG VITE_COBROS_API_URL=/api/cobros

ENV VITE_USUARIO_API_URL=$VITE_USUARIO_API_URL
ENV VITE_SUSCRIPCION_API_URL=$VITE_SUSCRIPCION_API_URL
ENV VITE_CATALOGO_API_URL=$VITE_CATALOGO_API_URL
ENV VITE_STREAMING_API_URL=$VITE_STREAMING_API_URL
ENV VITE_COBROS_API_URL=$VITE_COBROS_API_URL

COPY . .
RUN pnpm build

# ─── Stage 2: serve ──────────────────────────────────────────────────────────
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
