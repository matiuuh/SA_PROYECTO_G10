# ── Stage 1: build ────────────────────────────────────────────────────────────
# Build context: backend/   (docker-compose pasa context: ./backend)
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.35.1 && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1

WORKDIR /app

# Dependencias primero para aprovechar cache de capas.
# El glob go.mod* copia go.sum si ya existe; si no, go mod tidy lo genera.
COPY services/catalogo/go.mod* ./
RUN go mod download

# Código fuente del servicio y contratos proto
COPY services/catalogo/ .
COPY proto /proto

# Genera código Go desde el .proto.
# --go_opt=module=<modulo> stripea el prefijo del módulo del go_package,
# depositando los archivos en pkg/pb/catalogo/v1/ tal como espera el código.
RUN mkdir -p pkg/pb && \
    protoc \
      --proto_path=/proto \
      --go_out=paths=source_relative:pkg/pb \
      --go-grpc_out=paths=source_relative:pkg/pb \
      /proto/catalogo/v1/catalogo.proto \
      /proto/notificaciones/v1/notificaciones.proto

RUN go mod tidy && go build -o /catalogo-service ./cmd/server

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /catalogo-service /usr/local/bin/catalogo-service

EXPOSE 5003

ENTRYPOINT ["catalogo-service"]
