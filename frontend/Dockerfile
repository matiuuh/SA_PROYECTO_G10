# ─── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# shamefully-hoist=true: pone todos los paquetes en node_modules/ directamente,
# igual que npm. Sin esto, pnpm usa un store virtual y tsc no se encuentra en
# la ruta que espera el wrapper de .bin/tsc cuando corre en Docker.
RUN echo "shamefully-hoist=true" >> .npmrc

COPY package.json pnpm-lock.yaml ./
RUN NODE_ENV=development pnpm install --frozen-lockfile

# URLs de API inyectadas en build time (baked into el bundle de Vite).
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
